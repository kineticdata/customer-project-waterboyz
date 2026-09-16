import { Icon } from '../../../atoms/Icon.jsx';

/**
 * Sponsor Responsibilities, as an HTML page.
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
  portraitDate: 'Saturday, December 6',
  portraitPhone: '240-394-7126',
  pickupDate: 'Saturday, December 13',
  venue: 'Restoration Church, 7899 Opossumtown Pike, Frederick',
  contactEmail: 'christmasalivemaryland@gmail.com',
  giftValue: '$50',
};

const Section = ({ title, children }) => (
  <section className="flex-c-st gap-2 print-keep">
    <h2 className="text-h3 font-bold m-0">{title}</h2>
    {children}
  </section>
);

export const Responsibilities = () => (
  <article className="print-sheet flex-c-st gap-6 max-w-screen-md">
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

    <Section title="Your commitment">
      <p className="m-0 max-w-prose">
        Gifts for each child 18 years or younger living in the home, valued at
        roughly {SEASON.giftValue} per child. Your family&rsquo;s contact
        details and family number have been emailed to you.
      </p>
    </Section>

    <Section title="Getting in touch">
      <p className="m-0 max-w-prose">
        Text your family to introduce yourself, then follow up with a phone
        call as soon as you can. On that call:
      </p>
      <ol className="m-0 pl-5 flex-c-st gap-1 max-w-prose">
        <li>Confirm their address, names, and the ages and genders of the children.</li>
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

    <Section title="If you can't reach them">
      <p className="m-0 max-w-prose">
        Try three times. If you still haven&rsquo;t heard back, contact the
        church or organization named in your email. If there&rsquo;s no
        response within a week, email {SEASON.contactEmail} and we&rsquo;ll
        assign you a different family.
      </p>
    </Section>

    <Section title="Choosing gifts">
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

    <Section title="Drop-off">
      <p className="m-0 max-w-prose">
        Curb-side pickup is {SEASON.pickupDate} at {SEASON.venue}. You&rsquo;ll
        be given a time frame, and you&rsquo;ll need your family number. Stay in
        your car — we&rsquo;ll bring everything out to you.
      </p>
    </Section>

    <Section title="We also encourage you to">
      <ul className="m-0 pl-5 flex-c-st gap-1 max-w-prose">
        <li>Pray for your family.</li>
        <li>Invite them to your Christmas worship service.</li>
        <li>Keep in touch after the holiday.</li>
        <li>Include a Bible and devotionals in their native language.</li>
      </ul>
    </Section>

    <footer className="text-sm text-base-content/70 border-t border-base-300 pt-3">
      Questions? Email {SEASON.contactEmail}.
    </footer>
  </article>
);
