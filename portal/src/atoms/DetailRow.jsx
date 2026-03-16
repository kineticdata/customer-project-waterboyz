export const DetailRow = ({ label, children }) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-wide text-base-content/40 mb-1">
      {label}
    </p>
    {children}
  </div>
);

export const PillList = ({ items, emptyText }) =>
  items.length > 0 ? (
    <div className="flex flex-wrap gap-1.5">
      {items.map(item => (
        <span key={item} className="badge badge-outline badge-sm">
          {item}
        </span>
      ))}
    </div>
  ) : (
    <p className="text-sm text-base-content/40 italic">{emptyText}</p>
  );

export const BulletList = ({ items, emptyText }) =>
  items.length > 0 ? (
    <ul className="columns-1 sm:columns-2 gap-x-6 list-disc list-inside text-sm space-y-0.5">
      {items.map(item => (
        <li key={item} className="break-inside-avoid">
          {item}
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-base-content/40 italic">{emptyText}</p>
  );
