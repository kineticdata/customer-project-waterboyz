import t from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { saveSubmissionMultipart } from '@kineticdata/react';
import { Icon } from '../../../atoms/Icon.jsx';
import { toastError, toastSuccess } from '../../../helpers/toasts.js';

const FIELD_PROJECT_PHOTOS = 'Project Photos';

const getAttachmentLabel = attachment =>
  attachment?.name ||
  attachment?.filename ||
  attachment?.fileName ||
  attachment?.label ||
  'Attachment';

const getAttachmentUrl = attachment => {
  const link =
    attachment?.downloadUrl ||
    attachment?.url ||
    attachment?.link ||
    attachment?.href ||
    attachment?.downloadLink ||
    attachment?.previewUrl ||
    '';
  return link.replace(/^\/[^/]*/, '');
};
  

const normalizeAttachments = value => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value ? [value] : [];
  return [];
};

const sanitizeAttachment = attachment => {
  if (!attachment || typeof attachment !== 'object') return attachment;
  // Mirror Kinetic's serializer: only strip the link property.
  // eslint-disable-next-line no-unused-vars
  const { link, ...rest } = attachment;
  return rest;
};

const getExtension = value => {
  if (!value) return '';
  const match = String(value).match(/\.([a-z0-9]+)(?:\?|#|$)/i);
  return match ? match[1].toLowerCase() : '';
};

const isImageAttachment = (attachment, url, label) => {
  const contentType = attachment?.contentType || attachment?.type || '';
  if (contentType.startsWith('image/')) return true;
  const ext = getExtension(label) || getExtension(url);
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
};

const splitNameAndExt = name => {
  const match = String(name).match(/^(.*?)(\.[^.]+)?$/);
  return {
    base: (match?.[1] || '').trim(),
    ext: match?.[2] || '',
  };
};

const findValuesRawEntry = (valuesRaw, fieldName) => {
  if (!valuesRaw) return null;
  return (
    Object.values(valuesRaw).find(entry => entry?.name === fieldName) || null
  );
};

const attachDocumentIds = (attachments, valuesRaw, fieldName) => {
  const entry = findValuesRawEntry(valuesRaw, fieldName);
  if (!entry) return attachments;

  let rawList = [];
  if (typeof entry.rawValue === 'string') {
    try {
      rawList = JSON.parse(entry.rawValue) || [];
    } catch {
      rawList = [];
    }
  } else if (Array.isArray(entry.rawValue)) {
    rawList = entry.rawValue;
  }

  return attachments.map((attachment, index) => ({
    ...attachment,
    documentId: rawList?.[index]?.documentId || attachment?.documentId || null,
  }));
};

export const ProjectPhotos = ({ project, reloadProject, isClosed }) => {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileNames, setFileNames] = useState({});
  const [previewUrls, setPreviewUrls] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [removingIndex, setRemovingIndex] = useState(null);
  const attachments = useMemo(
    () => normalizeAttachments(project?.values?.[FIELD_PROJECT_PHOTOS]),
    [project],
  );
  const attachmentEntries = useMemo(() => {
    const valuesRaw = project?.valuesRaw || project?.values?.raw;
    const objectAttachments = attachments
      .filter(attachment => typeof attachment !== 'string')
      .map(sanitizeAttachment);
    const withIds = attachDocumentIds(
      objectAttachments,
      valuesRaw,
      FIELD_PROJECT_PHOTOS,
    );
    let objectIndex = 0;
    return attachments.map(attachment => {
      if (typeof attachment === 'string') {
        return { kind: 'string', raw: attachment, value: null };
      }
      const value = withIds[objectIndex] || attachment;
      const entry = {
        kind: 'object',
        raw: attachment,
        value,
        objectIndex,
      };
      objectIndex += 1;
      return entry;
    });
  }, [attachments, project]);
  const existingAttachments = useMemo(
    () =>
      attachmentEntries
        .filter(entry => entry.kind === 'object')
        .map(entry => entry.value),
    [attachmentEntries],
  );

  const handleFileChange = event => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
    setFileNames(
      files.reduce((acc, file, index) => {
        acc[index] = file.name;
        return acc;
      }, {}),
    );
  };

  useEffect(() => {
    const urls = selectedFiles.map(file => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));
    setPreviewUrls(urls);
    return () => {
      urls.forEach(item => URL.revokeObjectURL(item.url));
    };
  }, [selectedFiles]);

  const handleUpload = async () => {
    if (!project?.id || selectedFiles.length === 0) return;
    setUploading(true);

    const files = selectedFiles.map((file, index) => {
      const original = splitNameAndExt(file.name);
      const override = splitNameAndExt(fileNames[index] || file.name);
      const baseName = override.base || original.base || file.name;
      const normalizedName = `${baseName}${original.ext}`;
      const renamedFile =
        normalizedName === file.name
          ? file
          : new File([file], normalizedName, { type: file.type });
      return {
        field: FIELD_PROJECT_PHOTOS,
        file: renamedFile,
      };
    });

    const result = await saveSubmissionMultipart({
      id: project.id,
      // Preserve existing attachments so the new upload appends instead of replaces.
      values:
        existingAttachments.length > 0
          ? { [FIELD_PROJECT_PHOTOS]: existingAttachments }
          : {},
      files,
    });

    if (result?.error) {
      toastError({
        title: 'Unable to upload photos',
        description: result.error.message,
      });
    } else {
      toastSuccess({ title: 'Project photos updated.' });
      setSelectedFiles([]);
      setFileNames({});
      setShowUploadForm(false);
      reloadProject?.();
    }

    setUploading(false);
  };

  const handleRemove = async entry => {
    if (!project?.id || entry.kind !== 'object') return;
    setRemovingIndex(entry.objectIndex);
    const remaining = existingAttachments.filter(
      (_attachment, index) => index !== entry.objectIndex,
    );
    const result = await saveSubmissionMultipart({
      id: project.id,
      values: { [FIELD_PROJECT_PHOTOS]: remaining },
      files: [],
    });

    if (result?.error) {
      toastError({
        title: 'Unable to remove photo',
        description: result.error.message,
      });
    } else {
      toastSuccess({ title: 'Photo removed.' });
      reloadProject?.();
    }

    setRemovingIndex(null);
  };

  return (
    <div className="krounded-box border kbg-base-100 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Project Photos</div>
          <p className="mt-2 text-base-content/70">
            Before/after photos and uploads.
          </p>
        </div>
        {!isClosed && (
          <button
            type="button"
            className="kbtn kbtn-primary"
            onClick={() => setShowUploadForm(prev => !prev)}
          >
            <Icon name="upload" />
            {showUploadForm ? 'Hide Upload Form' : 'Upload Photos'}
          </button>
        )}
      </div>

      {!isClosed && showUploadForm && (
        <div className="mt-6 krounded-box border kbg-base-100/60 p-4">
          <div className="text-sm font-semibold">Upload Photos</div>
          <p className="mt-1 text-xs text-base-content/60">
            Use the Project Photos field to add new images.
          </p>
          <div className="mt-3">
            <input
              type="file"
              className="kfile-input kfile-input-bordered w-full"
              multiple
              accept="image/*"
              onChange={handleFileChange}
            />
            {selectedFiles.length > 0 && (
              <>
                <div className="mt-2 text-xs text-base-content/60">
                  {selectedFiles.length} file
                  {selectedFiles.length === 1 ? '' : 's'} selected
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="krounded-box border kbg-base-100 p-3"
                    >
                      {previewUrls[index]?.url ? (
                        <img
                          src={previewUrls[index].url}
                          alt={file.name}
                          className="h-40 w-full krounded-box object-cover"
                        />
                      ) : (
                        <div className="h-40 w-full krounded-box kbg-base-200" />
                      )}
                      <label className="kinput mt-2">
                        <span className="klabel">File Name: </span>
                        <input
                          type="text"
                          value={
                            splitNameAndExt(fileNames[index] || file.name).base
                          }
                          onChange={event =>
                            setFileNames(names => ({
                              ...names,
                              [index]: `${event.target.value}${splitNameAndExt(
                                file.name,
                              ).ext}`,
                            }))
                          }
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="kbtn kbtn-primary"
                onClick={handleUpload}
                disabled={uploading || selectedFiles.length === 0}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
              <button
                type="button"
                className="kbtn kbtn-ghost"
                onClick={() => {
                  setSelectedFiles([]);
                  setFileNames({});
                  setShowUploadForm(false);
                }}
                disabled={uploading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {attachments.length === 0 ? (
        <div className="mt-4 text-sm text-base-content/60">
          No photos have been uploaded yet.
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {attachmentEntries.map((entry, index) => {
            const attachment = entry.raw;
            if (entry.kind === 'string') {
              const url = attachment;
              const label = attachment.split('/').pop() || 'Attachment';
              const isImage = isImageAttachment(null, url, label);
              return (
                <a
                  key={`${attachment}-${index}`}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="krounded-box border kbg-base-100/60 p-3"
                >
                  {isImage ? (
                    <img
                      src={url}
                      alt={label}
                      className="h-40 w-full krounded-box object-cover"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <Icon name="photo-square-rounded" size={18} />
                      <span className="ktext-primary underline-offset-2 hover:underline">
                        {label}
                      </span>
                    </div>
                  )}
                </a>
              );
            }

            const url = getAttachmentUrl(attachment);
            const label = getAttachmentLabel(attachment);
            const isImage = isImageAttachment(attachment, url, label);
            return url ? (
              <div
                key={`${label}-${index}`}
                className="relative krounded-box border kbg-base-100/60 p-3"
              >
                <a href={url} target="_blank" rel="noreferrer">
                  {isImage ? (
                    <img
                      src={url}
                      alt={label}
                      className="h-40 w-full krounded-box object-cover"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <Icon name="photo-square-rounded" size={18} />
                      <span className="ktext-primary underline-offset-2 hover:underline">
                        {label}
                      </span>
                    </div>
                  )}
                </a>
                <div className="mt-2 flex items-center justify-between text-xs text-base-content/60 gap-2">
                  <span className="truncate">{label}</span>
                  {!isClosed && (
                    <button
                      type="button"
                      className="kbtn kbtn-xs kbtn-circle kbg-base-100/90 shadow-md border kborder-base-200 hover:kbg-base-100"
                      onClick={() => handleRemove(entry)}
                      disabled={removingIndex === entry.objectIndex || uploading}
                      aria-label="Remove photo"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div
                key={`${label}-${index}`}
                className="relative krounded-box border kbg-base-100/60 p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{label}</span>
                  {!isClosed && (
                    <button
                      type="button"
                      className="kbtn kbtn-xs kbtn-circle kbg-base-100/90 shadow-md border kborder-base-200 hover:kbg-base-100"
                      onClick={() => handleRemove(entry)}
                      disabled={removingIndex === entry.objectIndex || uploading}
                      aria-label="Remove photo"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

ProjectPhotos.propTypes = {
  project: t.object,
  family: t.any,
  familyLoading: t.bool,
  reloadProject: t.func,
  isClosed: t.bool,
};
