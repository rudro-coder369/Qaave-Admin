export function Button({ children, variant = 'primary', className = '', ...props }) {
  const baseStyles = "px-5 py-3 rounded-2xl font-black text-xs md:text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase";
  
  const variants = {
    primary: "bg-[#2563EB] hover:bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-500",
    secondary: "bg-[#1E293B] hover:bg-slate-800 text-slate-200 border border-slate-700",
    outline: "bg-transparent hover:bg-[#1E293B]/50 text-slate-300 border border-slate-800"
  };

  return (
    <button className={`${baseStyles} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  );
}