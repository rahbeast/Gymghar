import React, { useState, useEffect, useRef } from 'react';
import NepaliDate from 'nepali-date-converter';

const NepaliDatePicker = ({ value, onChange, placeholder = "Select date", disabled = false, darkMode = true }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentNepaliDate, setCurrentNepaliDate] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const calendarRef = useRef(null);

  // Color scheme
  const PRIMARY_COLOR = '#00e1ff';
  const BG_DARK = '#121212';
  const CARD_DARK = '#1e1e1e';
  const TEXT_LIGHT = '#e0e0e0';
  const TEXT_SECONDARY = '#a0a0a0';
  const BORDER_DARK = '#333333';
  const INPUT_DARK = '#282828';

  // Nepali month names
  const nepaliMonths = [
    'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज',
    'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फाल्गुन', 'चैत'
  ];

  // Nepali day names
  const nepaliDays = ['आइत', 'सोम', 'मंगल', 'बुध', 'बिहि', 'शुक्र', 'शनि'];

  // Initialize current date
  useEffect(() => {
    if (value) {
      try {
        const englishDate = new Date(value);
        const nepaliDate = new NepaliDate(englishDate);
        setCurrentNepaliDate(nepaliDate);
        setSelectedDate(nepaliDate);
      } catch (e) {
        const today = new NepaliDate();
        setCurrentNepaliDate(today);
      }
    } else {
      const today = new NepaliDate();
      setCurrentNepaliDate(today);
    }
  }, [value]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendar]);

  // Get days in Nepali month
  const getDaysInNepaliMonth = (year, month) => {
    const daysInMonths = {
      2080: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
      2081: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
      2082: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
      2083: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
      2084: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
      2085: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    };
    
    return daysInMonths[year]?.[month - 1] || 30;
  };

  // Get starting day of month
  const getStartDayOfMonth = (year, month) => {
    try {
      const nepaliDate = new NepaliDate(year, month - 1, 1);
      const englishDate = nepaliDate.toJsDate();
      return englishDate.getDay();
    } catch (e) {
      return 0;
    }
  };

  // Handle date selection
  const handleDateSelect = (day) => {
    try {
      const nepaliDate = new NepaliDate(
        currentNepaliDate.getYear(),
        currentNepaliDate.getMonth(),
        day
      );
      const englishDate = nepaliDate.toJsDate();
      const formattedDate = englishDate.toISOString().split('T')[0];
      
      setSelectedDate(nepaliDate);
      onChange(formattedDate);
      setShowCalendar(false);
    } catch (e) {
      console.error('Error selecting date:', e);
    }
  };

  // Navigate months
  const changeMonth = (direction) => {
    try {
      let newMonth = currentNepaliDate.getMonth() + direction;
      let newYear = currentNepaliDate.getYear();

      if (newMonth > 11) {
        newMonth = 0;
        newYear++;
      } else if (newMonth < 0) {
        newMonth = 11;
        newYear--;
      }

      const newDate = new NepaliDate(newYear, newMonth, 1);
      setCurrentNepaliDate(newDate);
    } catch (e) {
      console.error('Error changing month:', e);
    }
  };

  // Go to today
  const goToToday = () => {
    const today = new NepaliDate();
    setCurrentNepaliDate(today);
  };

  // Format display value
  const getDisplayValue = () => {
    if (!value) return placeholder;
    
    try {
      const englishDate = new Date(value);
      const nepaliDate = new NepaliDate(englishDate);
      const nepaliFormatted = nepaliDate.format('YYYY MMMM DD');
      const englishFormatted = englishDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      return `${nepaliFormatted} (${englishFormatted})`;
    } catch (e) {
      return value;
    }
  };

  // Render calendar days
  const renderCalendarDays = () => {
    if (!currentNepaliDate) return null;

    const year = currentNepaliDate.getYear();
    const month = currentNepaliDate.getMonth() + 1;
    const daysInMonth = getDaysInNepaliMonth(year, month);
    const startDay = getStartDayOfMonth(year, month);
    
    const days = [];
    
    // Empty cells before month starts
    for (let i = 0; i < startDay; i++) {
      days.push(
        <div key={`empty-${i}`} style={{ padding: '8px' }} />
      );
    }
    
    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = selectedDate && 
        selectedDate.getYear() === year && 
        selectedDate.getMonth() === month - 1 && 
        selectedDate.getDate() === day;
      
      const isToday = (() => {
        const today = new NepaliDate();
        return today.getYear() === year && 
               today.getMonth() === month - 1 && 
               today.getDate() === day;
      })();

      days.push(
        <div
          key={day}
          onClick={() => handleDateSelect(day)}
          style={{
            padding: '8px',
            textAlign: 'center',
            cursor: 'pointer',
            borderRadius: '6px',
            fontSize: '14px',
            color: isSelected ? BG_DARK : TEXT_LIGHT,
            background: isSelected ? PRIMARY_COLOR : 'transparent',
            fontWeight: isSelected ? '700' : isToday ? '600' : '400',
            border: isToday && !isSelected ? `2px solid ${PRIMARY_COLOR}` : 'none',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!isSelected) {
              e.target.style.background = INPUT_DARK;
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected) {
              e.target.style.background = 'transparent';
            }
          }}
        >
          {day}
        </div>
      );
    }
    
    return days;
  };

  if (!currentNepaliDate) return null;

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={calendarRef}>
      {/* Input Display */}
      <div
        onClick={() => !disabled && setShowCalendar(!showCalendar)}
        style={{
          width: '100%',
          padding: '14px 18px',
          border: `2px solid ${BORDER_DARK}`,
          borderRadius: '12px',
          fontSize: '16px',
          boxSizing: 'border-box',
          fontFamily: 'Arial, sans-serif',
          backgroundColor: disabled ? '#1a1a1a' : INPUT_DARK,
          color: value ? TEXT_LIGHT : TEXT_SECONDARY,
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none'
        }}
      >
        {getDisplayValue()}
      </div>

      {/* Calendar Dropdown */}
      {showCalendar && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: '8px',
          background: CARD_DARK,
          border: `1px solid ${BORDER_DARK}`,
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          zIndex: 1000,
          minWidth: '320px'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: `1px solid ${BORDER_DARK}`
          }}>
            <button
              onClick={() => changeMonth(-1)}
              style={{
                background: INPUT_DARK,
                border: `1px solid ${BORDER_DARK}`,
                color: PRIMARY_COLOR,
                padding: '8px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              ←
            </button>
            <div style={{
              fontSize: '16px',
              fontWeight: '700',
              color: TEXT_LIGHT
            }}>
              {nepaliMonths[currentNepaliDate.getMonth()]} {currentNepaliDate.getYear()}
            </div>
            <button
              onClick={() => changeMonth(1)}
              style={{
                background: INPUT_DARK,
                border: `1px solid ${BORDER_DARK}`,
                color: PRIMARY_COLOR,
                padding: '8px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              →
            </button>
          </div>

          {/* Day Names */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '4px',
            marginBottom: '8px'
          }}>
            {nepaliDays.map(day => (
              <div
                key={day}
                style={{
                  textAlign: 'center',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: TEXT_SECONDARY,
                  padding: '8px 4px'
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '4px',
            marginBottom: '12px'
          }}>
            {renderCalendarDays()}
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: '12px',
            borderTop: `1px solid ${BORDER_DARK}`
          }}>
            <button
              onClick={goToToday}
              style={{
                background: 'transparent',
                border: `1px solid ${PRIMARY_COLOR}`,
                color: PRIMARY_COLOR,
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600'
              }}
            >
              आज (Today)
            </button>
            <button
              onClick={() => setShowCalendar(false)}
              style={{
                background: INPUT_DARK,
                border: `1px solid ${BORDER_DARK}`,
                color: TEXT_SECONDARY,
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600'
              }}
            >
              बन्द गर्नुहोस् (Close)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NepaliDatePicker;