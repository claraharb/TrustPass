import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export type TimeRange = '7d' | '30d' | '90d';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

const RANGE_LABELS: Record<TimeRange, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
};

export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (range: TimeRange) => {
    onChange(range);
    setIsOpen(false);
  };

  return (
    <div className="time-range-wrapper" ref={containerRef}>
      <button
        type="button"
        className="time-range-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span>{RANGE_LABELS[value]}</span>
        <ChevronDown size={14} />
      </button>

      {isOpen && (
        <div className="time-range-menu" role="listbox">
          {(['7d', '30d', '90d'] as TimeRange[]).map((range) => (
            <button
              key={range}
              type="button"
              role="option"
              aria-selected={value === range}
              className={`time-range-option ${value === range ? 'active' : ''}`}
              onClick={() => handleSelect(range)}
            >
              {RANGE_LABELS[range]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
