import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react-native';
import { useAppTheme } from '@/context/ThemeContext';

export interface CenteredPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
}

export const CenteredPagination: React.FC<CenteredPaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 50,
  pageSizeOptions,
  onPageSizeChange,
}) => {
  const { theme, isDark } = useAppTheme();

  if (totalPages <= 1 && (!totalItems || totalItems <= itemsPerPage)) {
    return null;
  }

  // Calculate page numbers to display around the current page
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 12 }}>
      {pageSizeOptions && pageSizeOptions.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Text style={{ fontSize: 11, color: theme.textMuted, fontWeight: '600' }}>Show per move:</Text>
          {pageSizeOptions.map((size) => {
            const isSelected = size === itemsPerPage;
            return (
              <TouchableOpacity
                key={'size-' + size}
                delayPressIn={0}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                onPress={() => onPageSizeChange?.(size)}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                  backgroundColor: isSelected ? theme.primary : isDark ? '#1E293B' : '#F1F5F9',
                  borderWidth: 1,
                  borderColor: isSelected ? theme.primary : theme.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: isSelected ? '700' : '600',
                    color: isSelected ? '#FFFFFF' : theme.textSecondary,
                  }}
                >
                  {size}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {totalItems !== undefined && (
        <Text
          style={{
            fontSize: 11,
            color: theme.textSecondary,
            fontWeight: '600',
            marginBottom: 8,
          }}
        >
          Showing page {currentPage} of {totalPages || 1} ({totalItems} items total)
        </Text>
      )}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          borderRadius: 14,
          paddingHorizontal: 8,
          paddingVertical: 6,
          borderWidth: 1,
          borderColor: theme.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
          gap: 4,
        }}
      >
        {/* First Page Button */}
        <TouchableOpacity delayPressIn={0} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          disabled={currentPage <= 1}
          onPress={() => onPageChange(1)}
          activeOpacity={0.7}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
            opacity: currentPage <= 1 ? 0.35 : 1,
          }}
        >
          <ChevronsLeft size={16} color={theme.text} />
        </TouchableOpacity>

        {/* Previous Page Button */}
        <TouchableOpacity delayPressIn={0} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          disabled={currentPage <= 1}
          onPress={() => onPageChange(currentPage - 1)}
          activeOpacity={0.7}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
            opacity: currentPage <= 1 ? 0.35 : 1,
          }}
        >
          <ChevronLeft size={16} color={theme.text} />
        </TouchableOpacity>

        {/* Page Chips */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 }}>
          {pages.map((p, index) => {
            if (p === '...') {
              return (
                <Text
                  key={'ellipsis-' + index}
                  style={{
                    color: theme.textMuted,
                    fontSize: 12,
                    fontWeight: '700',
                    paddingHorizontal: 3,
                  }}
                >
                  ...
                </Text>
              );
            }

            const pageNum = Number(p);
            const isActive = pageNum === currentPage;

            return (
              <TouchableOpacity delayPressIn={0} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                key={pageNum}
                onPress={() => onPageChange(pageNum)}
                activeOpacity={0.75}
                style={{
                  minWidth: 32,
                  height: 32,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 6,
                  backgroundColor: isActive ? theme.primary : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: isActive ? '700' : '600',
                    color: isActive ? '#FFFFFF' : theme.text,
                  }}
                >
                  {pageNum}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Next Page Button */}
        <TouchableOpacity delayPressIn={0} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          disabled={currentPage >= totalPages}
          onPress={() => onPageChange(currentPage + 1)}
          activeOpacity={0.7}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
            opacity: currentPage >= totalPages ? 0.35 : 1,
          }}
        >
          <ChevronRight size={16} color={theme.text} />
        </TouchableOpacity>

        {/* Last Page Button */}
        <TouchableOpacity delayPressIn={0} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          disabled={currentPage >= totalPages}
          onPress={() => onPageChange(totalPages)}
          activeOpacity={0.7}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
            opacity: currentPage >= totalPages ? 0.35 : 1,
          }}
        >
          <ChevronsRight size={16} color={theme.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
};
