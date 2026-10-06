import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useData } from '../../../helpers/hooks/useData.js';
import { executeIntegration, executeWebApi } from '../../../helpers/api.js';

const AVAILABLE_INTEGRATION = 'CA - Available Families';
const MINE_INTEGRATION = 'CA - My Sponsorships';
const CLAIM_WEBAPI = 'christmas-alive-claim';

/**
 * Normalizes an operation's `Items` output into the shape the UI renders.
 * Tolerates the operation returning nothing so an empty season shows the
 * empty state rather than a crash.
 */
const toFamilies = response =>
  (response?.Items ?? response?.items ?? []).map(item => ({
    sponsorshipId: item.sponsorshipId ?? item['Sponsorship Id'] ?? item.id,
    familyNumber: item.familyNumber ?? item['Family Number'],
    totalMembers: Number(item.totalMembers ?? item['Total Members']) || 0,
    totalAdults: Number(item.totalAdults ?? item['Total Adults']) || 0,
    totalChildren: Number(item.totalChildren ?? item['Total Children']) || 0,
    nativeLanguage: item.nativeLanguage ?? item['Native Language'] ?? '',
    city: item.city ?? item.City ?? '',
    county: item.county ?? item.County ?? '',
    status: item.status ?? item.Status ?? '',
    claimedAt: item.claimedAt ?? item['Claimed At'] ?? '',
    // Only present on My Sponsorships, which is scoped to the caller -- it is
    // their own contact info, used to pre-fill their next claim.
    sponsorName: item.sponsorName ?? '',
    sponsorPhone: item.sponsorPhone ?? '',
  }));

const useOperation = (integrationName, season) => {
  const kappSlug = useSelector(state => state.app.kappSlug);
  const params = useMemo(
    () =>
      kappSlug && season
        ? { kappSlug, integrationName, parameters: { Season: season } }
        : null,
    [kappSlug, integrationName, season],
  );
  const { initialized, loading, response, actions } = useData(
    executeIntegration,
    params,
  );
  return {
    families: useMemo(() => toFamilies(response), [response]),
    loading: !initialized || loading,
    error: response?.error ?? null,
    reload: actions?.reloadData,
  };
};

/** Families still available to sponsor this season. */
export const useAvailableFamilies = season =>
  useOperation(AVAILABLE_INTEGRATION, season);

/** Families the signed-in user has sponsored. Identity is bound server-side. */
export const useMySponsorships = season => useOperation(MINE_INTEGRATION, season);

/**
 * Claim a family.
 *
 * The guard lives in the WebAPI, not here — losing a race is expected and
 * normal, so it returns a typed reason rather than throwing.
 *
 * The sponsor's name and phone ride along so the check-in team can reach
 * them; the WebAPI stores them on the sponsorship. Username and email are
 * taken from the session server-side, never from this request.
 */
export const useClaimFamily = () => {
  const kappSlug = useSelector(state => state.app.kappSlug);
  const [claiming, setClaiming] = useState(false);

  const claim = useCallback(
    async (sponsorshipId, { sponsorName = '', sponsorPhone = '' } = {}) => {
      setClaiming(true);
      try {
        const result = await executeWebApi({
          kappSlug,
          webApiSlug: CLAIM_WEBAPI,
          parameters: { sponsorshipId, sponsorName, sponsorPhone },
        });
        if (result?.error) {
          return { ok: false, reason: 'UNKNOWN', detail: result.error.message };
        }
        // A bare runId means the ?timeout window elapsed before the workflow
        // returned. The claim may or may not have landed, so say so honestly
        // rather than reporting a success we cannot confirm.
        if (result?.runId && result?.ok === undefined) {
          return { ok: false, reason: 'TIMEOUT' };
        }
        return result;
      } finally {
        setClaiming(false);
      }
    },
    [kappSlug],
  );

  return { claim, claiming };
};

const PACKET_WEBAPI = 'christmas-alive-packet';

/**
 * Full details for one sponsored family.
 *
 * Goes through a WebAPI rather than an operation because the authorization
 * fact (is the caller the sponsor of record, or an admin?) lives on the
 * sponsorship record while the protected data lives on the family record.
 * That decision has to be made server-side, between two reads.
 *
 * Renders live rather than from the season snapshot, so a corrected address
 * reaches the sponsor even though the email they received cannot be recalled.
 */
export const useFamilyPacket = sponsorshipId => {
  const kappSlug = useSelector(state => state.app.kappSlug);
  const params = useMemo(
    () =>
      kappSlug && sponsorshipId
        ? {
            kappSlug,
            webApiSlug: PACKET_WEBAPI,
            parameters: { sponsorshipId },
          }
        : null,
    [kappSlug, sponsorshipId],
  );
  const { initialized, loading, response } = useData(executeWebApi, params);
  return {
    packet: response?.ok === false ? null : (response ?? null),
    denied: response?.ok === false && response?.reason === 'NOT_AUTHORIZED',
    error: response?.error ?? null,
    loading: !initialized || loading,
  };
};
