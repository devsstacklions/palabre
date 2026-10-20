import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SearchBarProps {
  initialValue?: string;
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  initialValue = '',
  onSearch,
  placeholder = 'Ex. : erreur callback Wave Sénégal, signature Orange Money...',
  className = '',
}) => {
  const [value, setValue] = useState(initialValue);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(value);
    } else {
      navigate(`/search?q=${encodeURIComponent(value.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`flex gap-2 w-full max-w-3xl my-4 ${className}`}>
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-palabre-muted">
          <Search size={18} />
        </div>
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          aria-label="Rechercher une solution technique"
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-palabre-border rounded-btn text-palabre-text placeholder:text-palabre-muted text-sm md:text-base focus:border-palabre-primary focus:ring-1 focus:ring-palabre-primary focus:outline-none transition-all shadow-sm min-h-[46px]"
        />
      </div>
      <button
        type="submit"
        className="px-6 py-2.5 bg-palabre-primary hover:bg-palabre-primaryHover text-white rounded-btn font-semibold text-sm transition-colors cursor-pointer min-h-[46px] shadow-sm flex items-center justify-center gap-2"
      >
        <span>Rechercher</span>
      </button>
    </form>
  );
};

