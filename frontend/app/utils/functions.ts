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

export const formatDisplayName = (firstName?: string, lastName?: string) => {
  const first = firstName || '';
  const lastInitial = lastName?.substring(0, 1) || '';
  if (!first && !lastInitial) return '';
  if (!lastInitial) return first;
  return `${first} ${lastInitial}.`;
};
