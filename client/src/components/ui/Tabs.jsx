import { useState } from "react";

const variantClasses = {
  pills: "flex gap-1 p-1 bg-slate-100 rounded-xl",
  underline: "flex gap-0 border-b border-slate-200",
  enclosed: "flex gap-0",
};

const tabClasses = {
  pills: (active) =>
    `px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-150
     ${active ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"}`,
  underline: (active) =>
    `px-4 py-2.5 text-sm font-medium border-b-2 transition-colors duration-150 -mb-px
     ${active ? "border-primary-600 text-primary-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"}`,
  enclosed: (active) =>
    `px-4 py-2.5 text-sm font-medium border border-slate-200 transition-colors duration-150
     ${active ? "bg-white text-slate-900 border-b-white -mb-px" : "bg-slate-50 text-slate-500 hover:text-slate-700"}`,
};

export default function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = "pills",
  className = "",
}) {
  const [internalTab, setInternalTab] = useState(tabs[0]?.id);
  const currentTab = activeTab !== undefined ? activeTab : internalTab;

  const handleChange = (id) => {
    if (onChange) {
      onChange(id);
    } else {
      setInternalTab(id);
    }
  };

  return (
    <div className={`${variantClasses[variant]} ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleChange(tab.id)}
          className={tabClasses[variant](currentTab === tab.id)}
        >
          {tab.icon && <tab.icon className="h-4 w-4 mr-1.5" />}
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1.5 text-xs opacity-60">({tab.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}
