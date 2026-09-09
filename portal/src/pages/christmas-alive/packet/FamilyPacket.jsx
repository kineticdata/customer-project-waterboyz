import { useParams } from 'react-router-dom';
import { Icon } from '../../../atoms/Icon.jsx';
import { Loading } from '../../../components/states/Loading.jsx';
import { useFamilyPacket } from '../hooks/useSponsorships.js';
import { parseRoster, householdCounts, describeHousehold, familyLabel } from '../../../helpers/christmasAlive.js';

const Row = ({ label, value }) =>
  value ? (
    <div className="flex-c-st">
      <dt className="text-sm text-base-content/60">{label}</dt>
      <dd className="m-0">{value}</dd>
    </div>
  ) : null;

/**
 * The full family packet for a sponsor.
 *
 * Renders live from the family record every time it is opened, so a corrected
 * address reaches the sponsor even though the email they were sent cannot be
 * recalled. This page — not the email — is what a sponsor should shop and
 * deliver from.
 */
export const FamilyPacket = () => {
  const { sponsorshipId } = useParams();
  const { packet, denied, loading } = useFamilyPacket(sponsorshipId);

  if (loading) return <Loading />;

  if (denied || !packet) {
    return (
      <div className="kalert kalert-error kalert-soft max-w-prose">
        <Icon name="lock" size={20} />
        <span>You don&rsquo;t have access to this family&rsquo;s details.</span>
      </div>
    );
  }

  const roster = parseRoster(packet.roster ?? packet.familyMembersJson);
  // Household totals -- the roster excludes the head, who is shown under Contact.
  const counts = householdCounts(roster);
  const support = Array.isArray(packet.supportReceiving)
    ? packet.supportReceiving
    : parseRoster(packet.supportReceiving);

  return (
    <article className="print-sheet flex-c-st gap-5 max-w-screen-md">
      <header className="flex-bs gap-3 flex-wrap">
        <div className="flex-c-st">
          <h1 className="text-h1 font-bold m-0">
            {familyLabel(packet.familyNumber)}
          </h1>
          <p className="text-base-content/80 m-0">{describeHousehold(counts)}</p>
        </div>
        <button
          type="button"
          className="kbtn kbtn-outline kbtn-sm print-hide"
          onClick={() => window.print()}
        >
          <Icon name="printer" size={16} />
          Print or save as PDF
        </button>
      </header>

      <section className="flex-c-st gap-2">
        <h2 className="text-h3 font-bold m-0">Contact</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 m-0">
          <Row
            label="Head of household"
            value={[packet.firstName, packet.lastName].filter(Boolean).join(' ')}
          />
          <Row label="Phone" value={packet.phone} />
          <Row label="Email" value={packet.email} />
          <Row
            label="Address"
            value={[
              packet.addressLine1,
              packet.addressLine2,
              [packet.city, packet.state, packet.zip].filter(Boolean).join(' '),
            ]
              .filter(Boolean)
              .join(', ')}
          />
          <Row label="County" value={packet.county} />
          <Row label="Language" value={packet.nativeLanguage} />
          {packet.needsInterpreter && (
            <Row label="Interpreter" value="An interpreter is needed" />
          )}
          {packet.photoRequested && (
            <Row label="Family portrait" value="Requested — Dec 6, by appointment" />
          )}
        </dl>
      </section>

      <section className="flex-c-st gap-2">
        <h2 className="text-h3 font-bold m-0">Who you&rsquo;re shopping for</h2>
        <p className="text-sm text-base-content/70 m-0">
          Plus the head of household listed above. Gifts are asked for every
          child 18 or younger; gifts for adults are welcome but optional.
        </p>
        {roster.length === 0 ? (
          <p className="text-base-content/70 m-0">
            No other household members were recorded — just the head of
            household above. Contact Christmas Alive before you shop if that
            looks wrong.
          </p>
        ) : (
          <ul className="flex-c-st gap-2 list-none p-0 m-0">
            {roster.map((m, i) => (
              <li
                key={m.id || i}
                className="print-keep flex-bs gap-3 p-3 rounded-lg border border-base-300 flex-wrap"
              >
                <div className="flex-c-st">
                  <span className="font-semibold">
                    {[m.firstName, m.lastName].filter(Boolean).join(' ') ||
                      `Family member ${i + 1}`}
                  </span>
                  <span className="text-sm text-base-content/70">
                    {[m.type, m.gender, m.age !== '' && m.age != null ? `age ${m.age}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
                {(m.shirtSize || m.shoeSize) && (
                  <span className="text-sm text-base-content/80">
                    {[m.shirtSize && `Shirt ${m.shirtSize}`, m.shoeSize && `Shoe ${m.shoeSize}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {support.length > 0 && (
        <section className="flex-c-st gap-2">
          <h2 className="text-h3 font-bold m-0">Support the family receives</h2>
          <p className="m-0">{support.join(', ')}</p>
        </section>
      )}

      {packet.background && (
        <section className="flex-c-st gap-2">
          <h2 className="text-h3 font-bold m-0">About the family</h2>
          <p className="m-0 max-w-prose">{packet.background}</p>
        </section>
      )}

      <footer className="text-sm text-base-content/70 border-t border-base-300 pt-3">
        Keep {familyLabel(packet.familyNumber).toLowerCase()} handy — you&rsquo;ll
        be asked for the number at curb-side pickup.
      </footer>
    </article>
  );
};
