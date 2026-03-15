import { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  CoreForm,
  deleteSubmission,
  searchSubmissions,
} from '@kineticdata/react';
import { useSelector } from 'react-redux';
import { useData } from '../../helpers/hooks/useData.js';
import { Loading as Pending } from '../../components/states/Loading.jsx';
import { Error } from '../../components/states/Error.jsx';
import { TableComponent } from '../../components/kinetic-form/widgets/table.js';
import { PageHeading } from '../../components/PageHeading.jsx';
import { toastError, toastSuccess } from '../../helpers/toasts.js';
import { openConfirm } from '../../helpers/confirm.js';
import { callIfFn } from '../../helpers/index.js';
import clsx from 'clsx';

const rowTransform = ({ values, ...row }) => ({
  ...values,
  ...Object.fromEntries(Object.entries(row).map(([k, v]) => [`_${k}`, v])),
});

const dateFormat = dateString => format(new Date(dateString), 'PPPp');

const submissionLabel = (id, submissions) => {
  if (!id) return null;
  if (id.toLowerCase() === 'new') return 'New';
  return submissions?.find(s => s.id === id)?.label || id.slice(-6).toUpperCase();
};

export const AdminFormRecords = ({ adminForms }) => {
  const { formSlug, id } = useParams();
  const navigate = useNavigate();
  const { kappSlug } = useSelector(state => state.app);
  const form = adminForms?.find(f => f.slug === formSlug);

  const params = useMemo(
    () => ({
      kapp: kappSlug,
      form: formSlug,
      search: {
        include: ['details', 'values'],
        limit: 1000,
      },
    }),
    [kappSlug, formSlug],
  );

  const {
    initialized,
    loading,
    response,
    actions: { reloadData },
  } = useData(searchSubmissions, params);

  const handleCreated = useCallback(
    res => {
      reloadData();
      if (res.submission.coreState !== 'Submitted') {
        navigate(`./../${res.submission.id}`, { state: { persistToasts: true } });
      }
      if (res.submission.coreState === 'Draft') {
        toastSuccess({ title: 'Saved successfully.' });
      }
    },
    [navigate, reloadData],
  );

  const handleUpdated = useCallback(
    res => {
      reloadData();
      if (res.submission.coreState === 'Draft') {
        toastSuccess({ title: 'Saved successfully.' });
      } else {
        navigate('./..', { state: { persistToasts: true } });
      }
    },
    [navigate, reloadData],
  );

  const handleCompleted = useCallback(() => {
    reloadData();
    toastSuccess({ title: 'Saved successfully.' });
    navigate('./..', { state: { persistToasts: true } });
  }, [navigate, reloadData]);

  const isLoading = !adminForms || !initialized || (loading && !response);
  const showForm = typeof id === 'string';

  return (
    <div className="max-w-screen-lg full-form:max-w-full pt-1 pb-6">
      <PageHeading
        title={['Admin', form?.name, submissionLabel(id, response?.submissions)]
          .filter(Boolean)
          .join(' / ')}
        backTo="/admin"
      />

      {isLoading ? (
        <Pending />
      ) : (
        <>
          {showForm && (
            <div className="rounded-box md:border md:p-8">
              <CoreForm
                submission={id !== 'new' ? id : undefined}
                kapp={kappSlug}
                form={formSlug}
                components={{ Pending }}
                created={handleCreated}
                updated={handleUpdated}
                completed={handleCompleted}
              />
            </div>
          )}

          {response?.error || !form ? (
            <Error
              error={response?.error || { message: `Unable to locate the ${formSlug} form.` }}
            />
          ) : (
            <div className={clsx('', { hidden: showForm })}>
              <TableComponent
                data={response.submissions}
                rowTransform={rowTransform}
                columns={[
                  ...form.fields.map(field => ({
                    label: field.name,
                    property: field.name,
                  })),
                  { label: 'ID', property: '_id', visible: false },
                  {
                    label: 'Created',
                    property: '_createdAt',
                    displayTransform: dateFormat,
                    visible: false,
                  },
                  {
                    label: 'Updated',
                    property: '_updatedAt',
                    displayTransform: dateFormat,
                    visible: false,
                  },
                ]}
                addAction={{ label: `New ${form.name}`, onClick: () => navigate('new') }}
                selectAction={{ label: `Edit ${form.name}`, onClick: row => navigate(row._id) }}
                rowActions={[
                  {
                    label: `Delete ${form.name}`,
                    icon: 'trash',
                    onClick: row =>
                      openConfirm({
                        title: `Delete ${form.name}`,
                        description: `Are you sure you want to delete "${row._label || row._handle}"?`,
                        acceptLabel: 'Delete',
                        accept: () =>
                          deleteSubmission({ id: row._id }).then(({ error }) => {
                            if (error) {
                              toastError({ title: 'Delete Failed', description: error.message });
                            } else {
                              toastSuccess({ title: 'Deleted successfully' });
                              callIfFn(reloadData);
                            }
                          }),
                      }),
                  },
                ]}
                allowExport={false}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};
