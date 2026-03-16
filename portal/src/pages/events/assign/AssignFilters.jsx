import { Icon } from '../../../atoms/Icon.jsx';

export const AssignFilters = ({
  nameSearch,
  onNameSearchChange,
  orgFilter,
  onOrgFilterChange,
  allOrgs,
  allSkills,
  skillCounts,
  skillFilter,
  onToggleSkill,
  onClearSkills,
  skillFilterOpen,
  onToggleSkillFilter,
}) => (
  <>
    {/* Filter bar */}
    <div className="flex flex-wrap gap-3 mb-3">
      <input
        type="search"
        className="kinput kinput-bordered kinput-sm"
        placeholder="Search volunteer name…"
        value={nameSearch}
        onChange={e => onNameSearchChange(e.target.value)}
        style={{ minWidth: '200px' }}
      />
      <select
        className="kselect kselect-bordered kselect-sm"
        value={orgFilter}
        onChange={e => onOrgFilterChange(e.target.value)}
      >
        <option value="">All Organizations</option>
        {allOrgs.map(org => (
          <option key={org} value={org}>
            {org}
          </option>
        ))}
      </select>
      {allSkills.length > 0 && (
        <button
          type="button"
          className={`kbtn kbtn-sm gap-1.5 ${
            skillFilter.length > 0 ? 'kbtn-primary' : 'kbtn-outline'
          }`}
          onClick={onToggleSkillFilter}
        >
          <Icon name="filter" size={14} />
          Skills
          {skillFilter.length > 0 && (
            <span className="badge badge-sm badge-neutral ml-0.5">
              {skillFilter.length}
            </span>
          )}
        </button>
      )}
    </div>

    {/* Skill filter chips */}
    {skillFilterOpen && allSkills.length > 0 && (
      <div className="mb-5 rounded-box border border-base-200 bg-base-100 p-3">
        <div className="flex-bc mb-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-base-content/50">
            Filter by skill
          </span>
          {skillFilter.length > 0 && (
            <button
              type="button"
              className="text-xs text-base-content/50 hover:text-base-content"
              onClick={onClearSkills}
            >
              Clear all
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {allSkills.map(skill => {
            const isActive = skillFilter.includes(skill);
            return (
              <button
                key={skill}
                type="button"
                className={`badge cursor-pointer select-none transition-colors ${
                  isActive
                    ? 'badge-primary'
                    : 'badge-outline hover:bg-base-200'
                }`}
                onClick={() => onToggleSkill(skill)}
              >
                {skill}
                <span
                  className={`ml-1 text-[0.65rem] ${isActive ? 'opacity-80' : 'opacity-50'}`}
                >
                  {skillCounts[skill]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    )}
  </>
);
