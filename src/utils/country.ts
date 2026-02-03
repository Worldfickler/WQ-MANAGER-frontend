export const countryNameMap: Record<string, string> = {
  CN: '中国大陆',
  IN: '印度',
  KE: '肯尼亚',
  US: '美国',
  TW: '中国台湾',
  KR: '韩国',
  GB: '英国',
  SG: '新加坡',
  VN: '越南',
  MY: '马来西亚',
  HK: '中国香港',
  NG: '尼日利亚',
  ID: '印度尼西亚',
  TH: '泰国',
  HU: '匈牙利',
  AM: '亚美尼亚'
}

export const getCountryName = (code?: string | null) => {
  if (!code) return '-'
  const key = code.toUpperCase()
  return countryNameMap[key] || code
}
