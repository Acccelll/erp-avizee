import React from 'react';
import { StatusFamily, StatusIntention, statusConfig } from '@/types/erp';
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
    status: StatusFamily;
    intention?: StatusIntention;
    className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    status,
    intention = StatusIntention.WARNING,
    className = '',
}) => {
    const config = statusConfig[status];

    const bgColorMap = {
        [StatusIntention.SUCCESS]: 'bg-green-100',
        [StatusIntention.WARNING]: 'bg-yellow-100',
        [StatusIntention.ERROR]: 'bg-red-100',
    };

    const textColorMap = {
        [StatusIntention.SUCCESS]: 'text-green-800',
        [StatusIntention.WARNING]: 'text-yellow-800',
        [StatusIntention.ERROR]: 'text-red-800',
    };

    return (
        <Badge className={`${bgColorMap[intention]} ${textColorMap[intention]} ${className}`}>  
            <span className="mr-1">{config.icon}</span>  
            {config.label}  
        </Badge>
    );
};

export default StatusBadge;