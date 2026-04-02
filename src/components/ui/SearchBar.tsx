import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Buscar...',
  className = '',
}) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search
        size={15}
        className="absolute left-3 text-hc-muted pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full pl-9 pr-8 py-2 h-9
          bg-hc-surface border border-hc-border rounded-lg
          text-sm text-hc-text placeholder:text-hc-muted
          transition-colors duration-150
          focus:outline-none focus:border-hc-purple
        "
      />
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Limpar busca"
          className="absolute right-2.5 text-hc-muted hover:text-hc-text transition-colors"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
};
