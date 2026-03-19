import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  value: string | number;
  variation?: { value: number; isPositive: boolean; };
  icon?: React.ReactNode;
  onClick?: () => void;
  colorClass?: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  variation,
  icon,
  onClick,
  colorClass = 'bg-blue-50',
}) => {
  return (
    <Card onClick={onClick} className={`cursor-pointer hover:shadow-lg transition-shadow ${onClick ? 'cursor-pointer' : ''} ${colorClass}`}> 
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-sm font-medium text-gray-600'>
            {title}
          </CardTitle>
          {icon && <div className='text-2xl'>{icon}</div>}
        </div>
      </CardHeader>
      <CardContent>
        <div className='space-y-2'>
          <div className='text-3xl font-bold'>{value}</div>
          {variation && (
            <div className='flex items-center gap-1'>
              {variation.isPositive ? (
                <ArrowUpIcon className='w-4 h-4 text-green-500' />
              ) : (
                <ArrowDownIcon className='w-4 h-4 text-red-500' />
              )}
              <span className={variation.isPositive ? 'text-green-600' : 'text-red-600'}>
                {variation.value}%
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SummaryCard;