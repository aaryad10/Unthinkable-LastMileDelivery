import React, { useState } from 'react';
import { Order, TimelineEvent } from '../types';
import { StatusBadge } from './StatusBadge';
import { Calendar, CheckCircle2, AlertCircle, Clock, MapPin, Truck } from 'lucide-react';

interface TimelineProps {
  order: Order;
  onRescheduleClick?: () => void;
  id?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ order, onRescheduleClick, id }) => {
  // Sort events chronologically if they have date parseable strings, or keep as is (since state appends them sequentially)
  const events = order.timeline || [];

  const getEventIcon = (status: string) => {
    switch (status) {
      case 'Delivered':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'Failed':
        return <AlertCircle className="w-5 h-5 text-rose-600" />;
      case 'Out for Delivery':
        return <Truck className="w-5 h-5 text-purple-600" />;
      case 'In Transit':
        return <MapPin className="w-5 h-5 text-blue-600" />;
      case 'Picked Up':
      default:
        return <Clock className="w-5 h-5 text-amber-600" />;
    }
  };

  return (
    <div id={id || `timeline-container-${order.id}`} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-100 mb-6 gap-4">
        <div>
          <span className="text-xs font-mono text-slate-400">TRACKING NUMBER</span>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            {order.id}
            <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
              {order.orderType}
            </span>
          </h3>
        </div>
        <div className="flex flex-col items-start md:items-end">
          <span className="text-xs font-mono text-slate-400">CURRENT STATUS</span>
          <div className="mt-1">
            <StatusBadge status={order.status} />
          </div>
        </div>
      </div>

      {/* Address Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
          <div className="flex items-center gap-2 text-amber-600 mb-2 font-semibold text-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Pickup Address
          </div>
          <p className="text-slate-700 text-sm">{order.pickupAddress}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
          <div className="flex items-center gap-2 text-emerald-600 mb-2 font-semibold text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Drop Address
          </div>
          <p className="text-slate-700 text-sm">{order.dropAddress}</p>
        </div>
      </div>

      {/* Vertical Stepper Timeline */}
      <div className="relative border-l border-slate-200 ml-3.5 pl-6 space-y-6">
        {events.map((event, index) => {
          const isLast = index === events.length - 1;
          return (
            <div key={index} className="relative">
              {/* Icon container */}
              <span className="absolute -left-[38px] top-1.5 flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 shadow-xs">
                {getEventIcon(event.status)}
              </span>

              <div className="bg-white rounded-lg p-3 hover:bg-slate-50 transition border border-transparent hover:border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                  <span className="font-semibold text-sm text-slate-800">{event.status}</span>
                  <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {event.timestamp}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{event.notes}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Package Specs Footer */}
      <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap gap-y-4 gap-x-8 text-xs text-slate-500 font-mono">
        <div>
          <span className="block text-slate-400">DIMENSIONS</span>
          <span className="text-slate-700 font-semibold">{order.length} × {order.width} × {order.height} cm</span>
        </div>
        <div>
          <span className="block text-slate-400">WEIGHT</span>
          <span className="text-slate-700 font-semibold">{order.weight} kg</span>
        </div>
        <div>
          <span className="block text-slate-400">PAYMENT TYPE</span>
          <span className="text-slate-700 font-semibold">{order.paymentType}</span>
        </div>
        <div>
          <span className="block text-slate-400">CHARGES</span>
          <span className="text-slate-700 font-semibold text-sm font-sans">${order.charge.toFixed(2)}</span>
        </div>
        {order.scheduledDate && (
          <div>
            <span className="block text-slate-400">SCHEDULED</span>
            <span className="text-amber-600 font-semibold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {order.scheduledDate}
            </span>
          </div>
        )}
      </div>

      {/* Reschedule Button conditional on Failed status */}
      {order.status === 'Failed' && onRescheduleClick && (
        <div className="mt-6 p-4 bg-rose-50 border border-rose-100 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-rose-800">Delivery Attempt Failed</p>
              <p className="text-xs text-rose-600">The last delivery attempt was unsuccessful. You can reschedule the delivery window below.</p>
            </div>
          </div>
          <button
            id={`reschedule-btn-${order.id}`}
            onClick={onRescheduleClick}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition shadow-sm whitespace-nowrap active:scale-95"
          >
            <Calendar className="w-4 h-4" />
            Reschedule Delivery
          </button>
        </div>
      )}
    </div>
  );
};
