const TABS = ['BUILDING', 'FLOOR', 'ROOM'];

export default function AreaTabs({ activeTab, onChange, enabledTabs = TABS }) {
  const enabled = new Set(enabledTabs);

  return (
    <div className="tabs-group">
      {TABS.filter((tab) => enabled.has(tab)).map((tab) => (
        <button
          key={tab}
          type="button"
          className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
          onClick={() => onChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
