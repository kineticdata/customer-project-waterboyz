import t from 'prop-types';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  defineKqlQuery,
  saveSubmissionMultipart,
  searchSubmissions,
} from '@kineticdata/react';
import { Editor } from '@toast-ui/react-editor';
import { useData } from '../../../helpers/hooks/useData.js';
import { Loading } from '../../../components/states/Loading.jsx';
import { Error } from '../../../components/states/Error.jsx';
import { toastError, toastSuccess } from '../../../helpers/toasts.js';
import { Icon } from '../../../atoms/Icon.jsx';
import { Modal } from '../../../atoms/Modal.jsx';

const REIMBURSEMENTS_FORM = 'reimbursements';
const FIELD_PROJECT_ID = 'Project ID';
const FIELD_NOTES = 'Notes';
const FIELD_TOTAL_AMOUNT = 'Total Amount';
const FIELD_RECEIPTS = 'Receipts';
const FIELD_STATUS = 'Status';
const FIELD_PAYEE_NAME = 'Payee Name';
const FIELD_PAYEE_ADDRESS_1 = 'Payee Address Line 1';
const FIELD_PAYEE_ADDRESS_2 = 'Payee Address Line 2';
const FIELD_PAYEE_CITY = 'Payee City';
const FIELD_PAYEE_STATE = 'Payee State';
const FIELD_PAYEE_ZIP = 'Payee Zip';

const buildReimbursementsSearch = projectId => {
  const search = defineKqlQuery();
  search.equals(`values[${FIELD_PROJECT_ID}]`, 'projectId');
  search.end();

  return {
    q: search.end()({ projectId }),
    include: ['details', 'values'],
    limit: 200,
  };
};

const normalizeAttachments = value => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value ? [value] : [];
  return [];
};

const getAttachmentLabel = attachment =>
  attachment?.name ||
  attachment?.filename ||
  attachment?.fileName ||
  attachment?.label ||
  'Receipt';

const getAttachmentUrl = attachment =>
  attachment?.downloadUrl ||
  attachment?.url ||
  attachment?.link ||
  attachment?.href ||
  attachment?.downloadLink ||
  attachment?.previewUrl ||
  '';

export const ProjectExpenses = ({
  project,
  family: _family,
  familyLoading: _familyLoading,
}) => {
  const { kappSlug } = useSelector(state => state.app);
  const projectId = project?.id;
  const editorRef = useRef(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptFiles, setReceiptFiles] = useState([]);
  const [payeeName, setPayeeName] = useState('');
  const [payeeAddress1, setPayeeAddress1] = useState('');
  const [payeeAddress2, setPayeeAddress2] = useState('');
  const [payeeCity, setPayeeCity] = useState('');
  const [payeeState, setPayeeState] = useState('');
  const [payeeZip, setPayeeZip] = useState('');
  const [saving, setSaving] = useState(false);
  const [showNewExpense, setShowNewExpense] = useState(false);

  const params = useMemo(
    () =>
      projectId
        ? {
          kapp: kappSlug,
          form: REIMBURSEMENTS_FORM,
          search: buildReimbursementsSearch(projectId),
        }
        : null,
    [kappSlug, projectId],
  );

  const {
    initialized,
    loading,
    response,
    actions: { reloadData },
  } = useData(searchSubmissions, params);

  const data = response?.submissions || [];
  const error = response?.error;

  const handleNotesChange = useCallback(() => {
    const value = editorRef.current?.getInstance().getMarkdown() || '';
    setNotes(value);
  }, []);

  const handleReceiptChange = event => {
    const files = Array.from(event.target.files || []);
    setReceiptFiles(files);
  };

  const handleSubmit = useCallback(async () => {
    if (!projectId) return;
    setSaving(true);

    const files = receiptFiles.map(file => ({
      field: FIELD_RECEIPTS,
      file,
    }));

    const result = await saveSubmissionMultipart({
      kappSlug,
      formSlug: REIMBURSEMENTS_FORM,
      values: {
        [FIELD_PROJECT_ID]: projectId,
        [FIELD_NOTES]: notes,
        [FIELD_TOTAL_AMOUNT]: amount,
        [FIELD_STATUS]: 'Submitted',
        [FIELD_PAYEE_NAME]: payeeName,
        [FIELD_PAYEE_ADDRESS_1]: payeeAddress1,
        [FIELD_PAYEE_ADDRESS_2]: payeeAddress2,
        [FIELD_PAYEE_CITY]: payeeCity,
        [FIELD_PAYEE_STATE]: payeeState,
        [FIELD_PAYEE_ZIP]: payeeZip,
      },
      files,
    });

    if (result?.error) {
      toastError({
        title: 'Unable to save reimbursement',
        description: result.error.message,
      });
    } else {
      toastSuccess({ title: 'Reimbursement saved.' });
      setAmount('');
      setNotes('');
      setReceiptFiles([]);
      setPayeeName('');
      setPayeeAddress1('');
      setPayeeAddress2('');
      setPayeeCity('');
      setPayeeState('');
      setPayeeZip('');
      editorRef.current?.getInstance().setMarkdown('');
      reloadData();
      setShowNewExpense(false);
    }

    setSaving(false);
  }, [
    amount,
    kappSlug,
    notes,
    projectId,
    receiptFiles,
    reloadData,
    payeeName,
    payeeAddress1,
    payeeAddress2,
    payeeCity,
    payeeState,
    payeeZip,
  ]);

  return (
    <div className="krounded-box border kbg-base-100 p-6">
      <div className="text-lg font-semibold">Project Expenses</div>
      <p className="mt-2 ktext-base-content/70">
        Add reimbursements for project-related expenses.
      </p>

      <div className="mt-6">
        <div className="text-sm font-semibold">Existing Reimbursements</div>
        {!initialized || (loading && !data.length) ? (
          <div className="mt-3">
            <Loading />
          </div>
        ) : error ? (
          <div className="mt-3">
            <Error error={error} />
          </div>
        ) : data.length === 0 ? (
          <div className="mt-3 text-sm ktext-base-content/60">
            No reimbursements have been added yet.
          </div>
        ) : (
          <div className="mt-3 grid gap-3">
            {data.map(submission => {
              const values = submission?.values || {};
              const receipts = normalizeAttachments(values[FIELD_RECEIPTS]);
              return (
                <div
                  key={submission.id}
                  className="krounded-box border kbg-base-100/60 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold">
                      ${values[FIELD_TOTAL_AMOUNT] || '0.00'}
                    </div>
                    <div className="text-xs ktext-base-content/60">
                      {values[FIELD_STATUS] || 'Submitted'}
                    </div>
                  </div>
                  <div className="mt-1 text-sm ktext-base-content/70">
                    {values[FIELD_PAYEE_NAME] || 'Unknown Payee'}
                  </div>
                  {values[FIELD_NOTES] && (
                    <div className="mt-2 text-sm ktext-base-content/70 whitespace-pre-wrap">
                      {values[FIELD_NOTES]}
                    </div>
                  )}
                  {receipts.length > 0 && (
                    <div className="mt-3 flex flex-col gap-1">
                      {receipts.map((receipt, index) => {
                        if (typeof receipt === 'string') {
                          return (
                            <a
                              key={`${receipt}-${index}`}
                              href={receipt}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 text-sm ktext-primary underline-offset-2 hover:underline"
                            >
                              <Icon name="paperclip" size={16} />
                              {receipt.split('/').pop() || 'Receipt'}
                            </a>
                          );
                        }
                        const url = getAttachmentUrl(receipt);
                        const label = getAttachmentLabel(receipt);
                        return url ? (
                          <a
                            key={`${label}-${index}`}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 text-sm ktext-primary underline-offset-2 hover:underline"
                          >
                            <Icon name="paperclip" size={16} />
                            {label}
                          </a>
                        ) : (
                          <div
                            key={`${label}-${index}`}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Icon name="paperclip" size={16} />
                            {label}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-4">
          <button
            type="button"
            className="kbtn kbtn-primary"
            onClick={() => setShowNewExpense(true)}
          >
            Add New Expense
          </button>
        </div>
      </div>

      <Modal
        open={showNewExpense}
        onOpenChange={({ open }) => setShowNewExpense(open)}
        title="New Reimbursement"
        size="lg"
      >
        <div slot="body">
          <p className="mt-1 text-xs ktext-base-content/60">
            One reimbursement per person (one reimbursement = one check).
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="klabel flex flex-col items-start gap-2">
              <span className="klabel-text text-xs uppercase tracking-wide ktext-base-content/60">
                Total Amount
              </span>
              <input
                type="number"
                className="kinput kinput-bordered"
                value={amount}
                onChange={event => setAmount(event.target.value)}
                min="0"
                step="0.01"
              />
            </label>

            <label className="klabel flex flex-col items-start gap-2">
              <span className="klabel-text text-xs uppercase tracking-wide ktext-base-content/60">
                Receipts
              </span>
              <input
                type="file"
                className="kfile-input kfile-input-bordered w-full"
                multiple
                onChange={handleReceiptChange}
              />
            </label>
          </div>
          <fieldset className="mt-4 kfieldset">
            <legend className="kfieldset-legend text-xs uppercase tracking-wide ktext-base-content/60">
              Payee Information
            </legend>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="klabel flex flex-col items-start gap-2">
                <span className="klabel-text text-xs uppercase tracking-wide ktext-base-content/60">
                  Payee Name
                </span>
                <input
                  type="text"
                  className="kinput kinput-bordered"
                  value={payeeName}
                  onChange={event => setPayeeName(event.target.value)}
                />
              </label>
              <label className="klabel flex flex-col items-start gap-2">
                <span className="klabel-text text-xs uppercase tracking-wide ktext-base-content/60">
                  Payee Address Line 1
                </span>
                <input
                  type="text"
                  className="kinput kinput-bordered"
                  value={payeeAddress1}
                  onChange={event => setPayeeAddress1(event.target.value)}
                />
              </label>
              <label className="klabel flex flex-col items-start gap-2">
                <span className="klabel-text text-xs uppercase tracking-wide ktext-base-content/60">
                  Payee Address Line 2
                </span>
                <input
                  type="text"
                  className="kinput kinput-bordered"
                  value={payeeAddress2}
                  onChange={event => setPayeeAddress2(event.target.value)}
                />
              </label>
              <label className="klabel flex flex-col items-start gap-2">
                <span className="klabel-text text-xs uppercase tracking-wide ktext-base-content/60">
                  Payee City
                </span>
                <input
                  type="text"
                  className="kinput kinput-bordered"
                  value={payeeCity}
                  onChange={event => setPayeeCity(event.target.value)}
                />
              </label>
              <label className="klabel flex flex-col items-start gap-2">
                <span className="klabel-text text-xs uppercase tracking-wide ktext-base-content/60">
                  Payee State
                </span>
                <input
                  type="text"
                  className="kinput kinput-bordered"
                  value={payeeState}
                  onChange={event => setPayeeState(event.target.value)}
                />
              </label>
              <label className="klabel flex flex-col items-start gap-2">
                <span className="klabel-text text-xs uppercase tracking-wide ktext-base-content/60">
                  Payee Zip
                </span>
                <input
                  type="text"
                  className="kinput kinput-bordered"
                  value={payeeZip}
                  onChange={event => setPayeeZip(event.target.value)}
                />
              </label>
            </div>
          </fieldset>
          <label className="klabel mt-4 flex flex-col items-start gap-2">
            <span className="klabel-text text-xs uppercase tracking-wide ktext-base-content/60">
              Memo
            </span>
            <div className="mt-2 krounded-box border kbg-base-100 p-2">
              <Editor
                ref={editorRef}
                height="220px"
                initialEditType="markdown"
                initialValue={notes || ''}
                onChange={handleNotesChange}
                hideModeSwitch={true}
              />
            </div>
          </label>
        </div>
        <div slot="footer" className="flex-ee gap-2">
          <button
            type="button"
            className="kbtn kbtn-ghost"
            onClick={() => setShowNewExpense(false)}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="kbtn kbtn-primary"
            onClick={handleSubmit}
            disabled={saving || !amount}
          >
            {saving ? 'Saving...' : 'Save Reimbursement'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

ProjectExpenses.propTypes = {
  project: t.object,
  family: t.any,
  familyLoading: t.bool,
};
