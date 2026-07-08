import {Photo_URL} from '../services/api';

export const getImageURL = (path?: string) => {
  var result = path;
  if (path == undefined || path.length == 0) {
    result = '';
  } else {
    const isHttp =
      path.indexOf('http://') === 0 || path.indexOf('https://') === 0;
    const isLocal = !isHttp && path.length > 50;
    if (isHttp || isLocal) {
      result = path;
    } else {
      result = Photo_URL + path;
    }
  }

  return result;
};

export const checkLocalPath = (path?: string) => {
  if (path == undefined || path.length == 0) {
    return false;
  }
  const isHttp =
    path.indexOf('http://') === 0 || path.indexOf('https://') === 0;
  const isLocal = !isHttp && path.length > 50;

  return isLocal;
};

export const convertStringToNumber = (str: string, failedVal = 0) => {
  var parsedFloat = parseFloat(str);
  if (Number.isNaN(parsedFloat)) {
    parsedFloat = failedVal;
  }
  return parsedFloat;
};

export const ConvertStringToNumberArr = (str: string) => {
  var arr = str.split(',').map((item: string, idx: number) => {
    return parseInt(item);
  });
  return arr;
};

export const GetOrderString = (orderId: number) => {
  var numberString = orderId.toString();
  while (numberString.length < 10) {
    numberString = '0' + numberString;
  }
  return 'ORDER' + numberString;
};

export const Delay = (ms: number) => {
  return new Promise(res => {
    setTimeout(res, ms);
  });
};

// Some records come back from the API with the literal strings "null" or
// "undefined" (e.g. a null DB column that got stringified upstream). Treat
// those — and whitespace-only values — as empty so they never render as text.
export const cleanText = (value?: string | null): string => {
  if (value == null) return '';
  const trimmed = String(value).trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
    return '';
  }
  return trimmed;
};

// Capitalizes the first letter of each space-separated word, leaving the rest
// of each word untouched (so "pumpkin seeds" -> "Pumpkin Seeds" but "BBQ sauce"
// -> "BBQ Sauce"). Used for chef-entered names like custom add-ons.
export const capitalizeWords = (value?: string | null): string =>
  cleanText(value)
    .split(' ')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');

export const formatDisplayName = (firstName?: string, lastName?: string, includeLastInitial: boolean = true) => {
  const first = firstName || '';
  if (!includeLastInitial) return first;
  const lastInitial = lastName?.substring(0, 1) || '';
  if (!first && !lastInitial) return '';
  if (!lastInitial) return first;
  return `${first} ${lastInitial}.`;
};
