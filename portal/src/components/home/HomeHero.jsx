/**
 * Standard primary-color hero banner used on role-specific home pages.
 * Accepts optional eyebrow text, a title, subtitle, and a children slot for
 * CTA buttons or other inline content below the subtitle.
 */
export const HomeHero = ({ eyebrow, title, subtitle, children, py = 'py-10 md:py-16' }) => (
  <div className="relative bg-primary overflow-hidden">
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.06) 0%, transparent 50%)',
      }}
    />
    <div className={`relative z-10 gutter ${py}`}>
      <div className="max-w-screen-xl mx-auto">
        {eyebrow && (
          <p className="text-primary-content/60 text-sm font-medium uppercase tracking-wider mb-2">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl md:text-5xl font-bold text-primary-content mb-3">
          {title}
        </h1>
        {subtitle && (
          <p className="text-primary-content/70 text-lg max-w-lg">
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </div>
  </div>
);
