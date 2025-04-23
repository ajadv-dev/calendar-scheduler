import moment from "moment";
import { View } from "react-big-calendar";

export const getRangeForView = (view: View, date: Date): { start: Date; end: Date } => {
      switch (view) {
        case 'month':
          return {
            start: moment(date).startOf('month').startOf('week').toDate(),
            end: moment(date).endOf('month').endOf('week').toDate(),
          };
        case 'week':
          return {
            start: moment(date).startOf('week').toDate(),
            end: moment(date).endOf('week').toDate(),
          };
        case 'day':
          return {
            start: moment(date).startOf('day').toDate(),
            end: moment(date).endOf('day').toDate(),
          };
        case 'agenda':
          // For agenda, let's just show a 30-day range from the current date as example
          return {
            start: moment(date).startOf('day').toDate(),
            end: moment(date).add(30, 'days').endOf('day').toDate(),
          };
        default:
          // fallback to month range
          return {
            start: moment(date).startOf('month').startOf('week').toDate(),
            end: moment(date).endOf('month').endOf('week').toDate(),
          };
      }
    };