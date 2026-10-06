import { Icon } from '../../../atoms/Icon.jsx';
import { StringLights } from '../StringLights.jsx';
import { Endorsement } from '../Endorsement.jsx';
import { useChristmasAlive } from '../hooks/useChristmasAlive.js';

/**
 * Sponsor Responsibilities, as an HTML page -- and as `SponsorGuide`, the same
 * content embedded at the end of each family packet so a printed or saved
 * packet carries both the family's details and what sponsors do.
 *
 * Replaces the 2.3 MB JPEG that was previously emailed to sponsors: this
 * prints cleanly, can be linked, and can be edited each season without a
 * graphic designer.
 *
 * Season-specific details live in one object so next year is a single edit.
 * If these start changing more often, move them onto the Christmas Alive
 * `programs` record alongside the season window.
 */
const SEASON = {
  portraitDate: 'Saturday, December 12',
  portraitPhone: '240-394-7126',
  pickupDate: 'Saturday, December 19',
  venue: 'Restoration Church, 7899 Opossumtown Pike, Frederick',
  contactEmail: 'christmasalivemaryland@gmail.com',
  giftValue: '$50',
};

// `nested` drops each heading one level, for when the guide sits under the
// packet's own "What sponsors do" heading rather than being the page.
const Section = ({ title, nested, children }) => {
  const Heading = nested ? 'h3' : 'h2';
  return (
    <section className="flex-c-st gap-2 print-keep">
      <Heading
        className={nested ? 'text-lg font-bold m-0' : 'text-h3 font-bold m-0'}
      >
        {title}
      </Heading>
      {children}
    </section>
  );
};

/**
 * Everything a sponsor is asked to do, without a page header. One copy, used
 * by the Responsibilities page and the family packet, so a seasonal edit to
 * SEASON or the wording shows up in both.
 */
export const SponsorGuide = ({ nested = false }) => (
  <>
    <Section nested={nested} title="Your commitment">
      <p className="m-0 max-w-prose">
        Gifts for each child 18 years or younger living in the home, valued at
        roughly {SEASON.giftValue} per child. Your family&rsquo;s contact
        details and family number have been emailed to you.
      </p>
    </Section>

    <Section nested={nested} title="Getting in touch">
      <p className="m-0 max-w-prose">
        Text your family to introduce yourself, then follow up with a phone call
        as soon as you can. On that call:
      </p>
      <ol className="m-0 pl-5 flex-c-st gap-1 max-w-prose">
        <li>
          Confirm their address, names, and the ages and genders of the
          children.
        </li>
        <li>
          Collect a list of Christmas wishes for each person. Gift cards are a
          good option — they let the parent choose.
        </li>
        <li>
          Let them know they can book a free family portrait on{' '}
          {SEASON.portraitDate} by calling {SEASON.portraitPhone}. That number
          is for booking portraits only — everything else goes to{' '}
          {SEASON.contactEmail}.
        </li>
      </ol>
    </Section>

    <Section nested={nested} title="If you can't reach them">
      <p className="m-0 max-w-prose">
        Try three times. If you still haven&rsquo;t heard back, contact the
        church or organization named in your email. If there&rsquo;s no response
        within a week, email {SEASON.contactEmail} and we&rsquo;ll assign you a
        different family.
      </p>
    </Section>

    <Section nested={nested} title="Choosing gifts">
      <p className="m-0 max-w-prose">
        These families need everyday things — clothing, books, toys, household
        goods. Good quality without designer labels stretches your money
        further. Please avoid music, films, and games with mature themes, since
        they may not suit everyone in the home.
      </p>
      <dl className="flex-c-st gap-3 m-0">
        <div className="flex-c-st print-keep">
          <dt className="font-semibold">Children up to 12</dt>
          <dd className="m-0 max-w-prose">
            One or two gifts around {SEASON.giftValue} each — a mix of toys
            (books, puzzles, games, crafts) and clothing.
          </dd>
        </div>
        <div className="flex-c-st print-keep">
          <dt className="font-semibold">Teenagers, 13 to 17</dt>
          <dd className="m-0 max-w-prose">
            One or two gifts around {SEASON.giftValue} each. Gift cards to
            Target, Kohl&rsquo;s or Walmart work well, as do specific clothing
            requests and age-appropriate books and games.
          </dd>
        </div>
        <div className="flex-c-st print-keep">
          <dt className="font-semibold">Adults (optional)</dt>
          <dd className="m-0 max-w-prose">
            One or two gifts around {SEASON.giftValue} each — small items like
            socks, gloves, a wallet or toiletries, specific clothing or
            household needs, or a gift card. If the family booked a portrait, an
            8&times;10 frame is a thoughtful addition.
          </dd>
        </div>
      </dl>
    </Section>

    <Section nested={nested} title="Drop-off">
      <p className="m-0 max-w-prose">
        Curb-side pickup is {SEASON.pickupDate} at {SEASON.venue}. You&rsquo;ll
        be given a time frame, and you&rsquo;ll need your family number. Stay in
        your car — we&rsquo;ll bring everything out to you.
      </p>
    </Section>

    <Section nested={nested} title="We also encourage you to">
      <ul className="m-0 pl-5 flex-c-st gap-1 max-w-prose">
        <li>Pray for your family.</li>
        <li>Invite them to your Christmas worship service.</li>
        <li>Keep in touch after the holiday.</li>
        <li>Include a Bible and devotionals in their native language.</li>
      </ul>
    </Section>

    <p className="text-sm text-base-content/70 m-0">
      Questions? Email {SEASON.contactEmail}.
    </p>
  </>
);

export const Responsibilities = () => {
  const { season } = useChristmasAlive();
  return (
    <article className="print-sheet ca-card ca-card-hero flex-c-st gap-6 max-w-screen-md p-6 md:p-10">
      <div className="ca-print-only">
        <StringLights drawWidth={720} />
        <p className="flex-ss gap-3 m-0 mt-2">
          <span className="ca-script text-[2.5rem] text-[var(--ca-red)]">
            Christmas Alive
          </span>
          {season && <span className="ca-numeral text-xl mt-1">{season}</span>}
        </p>
      </div>
      <header className="flex-bs gap-3 flex-wrap">
        <div className="flex-c-st">
          <h1 className="text-h1 font-bold m-0">What sponsors do</h1>
          <p className="text-base-content/80 m-0 max-w-prose">
            Thank you for sponsoring a family. Here&rsquo;s what to expect and
            what we&rsquo;re asking of you.
          </p>
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
      <SponsorGuide />
      <footer className="border-t border-base-300 pt-4">
        <Endorsement />
      </footer>
    </article>
  );
};
