import React from 'react';
import { Order } from '../types';
import { StatusBadge } from './StatusBadge';
import { ArrowRight, Package, Truck, CreditCard, Calendar } from 'lucide-react';

interface OrderCardProps {
  order: Order;
  onActionClick: () => void;
  actionLabel: string;
  id?: string;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onActionClick, actionLabel, id }) => {
  return (
    <div
      id={id || `order-card-${order.id}`}
      className="bg-white rounded-xl shadow-xs border border-slate-100 p-5 hover:shadow-md hover:border-slate-200 transition duration-200 flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <span className="p-1.5 bg-slate-50 text-slate-500 rounded-lg">
              <Package className="w-4 h-4" />
            </span>
            <div>
              <span className="text-xs font-mono text-slate-400">ID: {order.id}</span>
              <div className="text-xs text-slate-400 font-mono">{order.createdAt.split(' ')[0]}</div>
            </div>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="space-y-2.5 my-4">
          <div className="text-xs">
            <span className="text-slate-400 font-mono block uppercase tracking-wider">RECIPIENT / DESTINATION</span>
            <span className="font-semibold text-slate-800 block truncate">{order.customerName}</span>
            <span className="text-slate-600 block line-clamp-1 text-xs">{order.dropAddress}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50 text-[11px] font-mono text-slate-500">
            <div>
              <span className="block text-slate-400">TYPE</span>
              <span className="font-semibold text-slate-700">{order.orderType} • {order.paymentType}</span>
            </div>
            <div>
              <span className="block text-slate-400">WEIGHT</span>
              <span className="font-semibold text-slate-700">{order.weight} kg</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-4 mt-2">
        <div>
          <span className="text-[10px] font-mono text-slate-400 block">TOTAL CHARGES</span>
          <span className="text-sm font-bold text-slate-900">${order.charge.toFixed(2)}</span>
        </div>

        <button
          onClick={onActionClick}
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition group active:translate-x-0.5"
        >
          {actionLabel}
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
