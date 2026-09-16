import { bundle, getCsrfToken } from '@kineticdata/react';

const handleResponse = async response => {
  const data = await response.json();
  if (!response.ok) throw data;
  return data;
};

const handleError = error => {
  if (typeof error === 'object') {
    const { error: m1, errorKey: key = null, message: m2, ...rest } = error;
    const message = m1 || m2 || 'Unexpected error occurred.';
    return { error: { ...rest, message, key } };
  }
  return { error: { message: 'Unexpected error occurred.' } };
};

export const executeIntegration = ({
  kappSlug,
  formSlug,
  integrationName,
  parameters,
}) =>
  fetch(
    [
      `${bundle.apiLocation()}/integrations/kapps/${kappSlug}`,
      formSlug && `/forms/${formSlug}`,
      `/${integrationName}`,
    ]
      .filter(Boolean)
      .join(''),
    {
      method: 'POST',
      body: JSON.stringify(parameters ?? {}),
      headers: {
      'Content-Type': 'application/json',
      'X-XSRF-TOKEN': getCsrfToken(),
    },
    },
  )
    .then(handleResponse)
    .catch(handleError);

/**
 * Invokes a kapp-level WebAPI and waits for the workflow's actual response.
 *
 * Two things differ from `executeIntegration` and both are easy to get wrong:
 *
 * 1. WebAPIs are served from `/app/kapps/{kapp}/webApis/{slug}`, NOT from the
 *    `/app/api/v1` base that `bundle.apiLocation()` returns.
 * 2. Without a `?timeout` query parameter the platform returns immediately with
 *    `{messageType: 'success', message: 'Initiated run #N', runId: 'N'}` — the
 *    run id, not the result. Callers that need the workflow's answer (the
 *    sponsor claim needs to know whether it won the race) MUST pass a timeout.
 *
 * @param {string} kappSlug
 * @param {string} webApiSlug
 * @param {Object} [parameters] JSON body
 * @param {number} [timeout=20] Seconds to wait inline. Platform max is 30.
 */
export const executeWebApi = ({
  kappSlug,
  webApiSlug,
  parameters,
  timeout = 20,
}) => {
  // apiLocation() is the Core API base (…/app/api/v1); WebAPIs hang off …/app.
  const appBase = bundle.apiLocation().replace(/\/api\/v1\/?$/, '');
  return fetch(
    `${appBase}/kapps/${kappSlug}/webApis/${webApiSlug}?timeout=${timeout}`,
    {
      method: 'POST',
      body: JSON.stringify(parameters ?? {}),
      headers: {
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': getCsrfToken(),
      },
    },
  )
    .then(handleResponse)
    .catch(handleError);
};
