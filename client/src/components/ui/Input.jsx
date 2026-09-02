import { forwardRef } from "react";

const Input = forwardRef(
  (
    {
      label,
      error,
      helper,
      icon: Icon,
      iconRight: IconRight,
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
          {Icon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Icon className="h-4 w-4 text-slate-400" />
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full h-10 px-3.5 text-sm rounded-lg
              bg-white text-slate-900 placeholder:text-slate-400
              border transition-colors duration-150
              ${
                error
                  ? "border-danger-500 focus:border-danger-500 focus:ring-danger-500/20"
                  : "border-slate-200 hover:border-slate-300 focus:border-primary-500 focus:ring-primary-500/20"
              }
              focus:outline-none focus:ring-2
              disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed
              ${Icon ? "pl-10" : ""}
              ${IconRight ? "pr-10" : ""}
              ${className}
            `.trim()}
            {...props}
          />
          {IconRight && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <IconRight className="h-4 w-4 text-slate-400" />
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-danger-600">{error}</p>
        )}
        {helper && !error && (
          <p className="text-xs text-slate-400">{helper}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
