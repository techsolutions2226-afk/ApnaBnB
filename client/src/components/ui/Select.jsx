import { forwardRef } from "react";
import { FiCheck, FiChevronDown } from "react-icons/fi";

const Select = forwardRef(
  (
    {
      label,
      error,
      helper,
      placeholder = "Select...",
      options = [],
      value,
      onChange,
      className = "",
      wrapperClassName = "",
      ...props
    },
    ref
  ) => {
    return (
      <div className={`flex flex-col gap-1.5 ${wrapperClassName}`}>
        {label && (
          <label className="text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            value={value}
            onChange={onChange}
            className={`
              w-full h-10 px-3.5 pr-10 text-sm rounded-lg appearance-none
              bg-white text-slate-900
              border transition-colors duration-150
              ${
                error
                  ? "border-danger-500 focus:border-danger-500 focus:ring-danger-500/20"
                  : "border-slate-200 hover:border-slate-300 focus:border-primary-500 focus:ring-primary-500/20"
              }
              focus:outline-none focus:ring-2
              disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed
              ${className}
            `.trim()}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <FiChevronDown className="h-4 w-4 text-slate-400" />
          </div>
        </div>
        {error && <p className="text-xs text-danger-600">{error}</p>}
        {helper && !error && (
          <p className="text-xs text-slate-400">{helper}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export default Select;
