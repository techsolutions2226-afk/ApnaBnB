import { forwardRef } from "react";
import { FiLoader } from "react-icons/fi";

const variants = {
  primary:
    "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-sm",
  secondary:
    "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 active:bg-slate-100 shadow-xs",
  ghost:
    "text-slate-600 hover:bg-slate-100 active:bg-slate-200",
  danger:
    "bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-800 shadow-sm",
  success:
    "bg-accent-600 text-white hover:bg-accent-700 active:bg-accent-800 shadow-sm",
};

const sizes = {
  xs: "h-8 px-3 text-xs gap-1.5 rounded-md",
  sm: "h-9 px-3.5 text-sm gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-lg",
  lg: "h-11 px-5 text-base gap-2 rounded-lg",
  xl: "h-12 px-6 text-base gap-2.5 rounded-xl",
};

const iconOnlySizes = {
  xs: "h-8 w-8 rounded-md",
  sm: "h-9 w-9 rounded-lg",
  md: "h-10 w-10 rounded-lg",
  lg: "h-11 w-11 rounded-lg",
  xl: "h-12 w-12 rounded-xl",
};

const Button = forwardRef(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      icon: Icon,
      iconRight: IconRight,
      children,
      className = "",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const isIconOnly = iconOnlySizes[size] && !children;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center font-medium
          transition-all duration-150 ease-out
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500
          disabled:opacity-50 disabled:cursor-not-allowed
          select-none touch-manipulation
          ${variants[variant]}
          ${isIconOnly ? iconOnlySizes[size] : sizes[size]}
          ${className}
        `.trim()}
        {...props}
      >
        {loading ? (
          <FiLoader className="h-4 w-4 animate-spin" />
        ) : Icon ? (
          <Icon className="h-4 w-4 shrink-0" />
        ) : null}
        {children}
        {IconRight && !loading && <IconRight className="h-4 w-4 shrink-0" />}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
