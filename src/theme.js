// src/theme.js — HDFC Bank-style MUI theme
import { createTheme } from '@mui/material/styles';

// HDFC Bank brand palette
const HDFC = {
  red:         '#E22026',
  redDark:     '#B71C1C',
  redLight:    '#FDECEA',
  navy:        '#003E8A',
  navyDark:    '#002D65',
  white:       '#FFFFFF',
  pageBg:      '#F4F5F8',
  cardBg:      '#FFFFFF',
  border:      '#DDE1E7',
  borderLight: '#ECEEF2',
  text:        '#1A1A1A',
  subtext:     '#5A6472',
  placeholder: '#9AA3AE',
  success:     '#1B7E47',
  successBg:   '#E8F5EE',
  warning:     '#B25E00',
  warningBg:   '#FFF3E0',
  error:       '#C62828',
  errorBg:     '#FDECEA',
  info:        '#0055A5',
  infoBg:      '#E8F0FB',
};

const COLORS = {
  blue:    { main: HDFC.red, dark: HDFC.redDark, light: HDFC.redLight, sidebar: HDFC.navy },
  purple:  { main: HDFC.red, dark: HDFC.redDark, light: HDFC.redLight, sidebar: HDFC.navy },
  emerald: { main: HDFC.red, dark: HDFC.redDark, light: HDFC.redLight, sidebar: HDFC.navy },
};

export const createBankTheme = (bankColor = 'blue') => {
  const c = COLORS[bankColor] ?? COLORS.blue;

  return createTheme({
    palette: {
      mode: 'light',
      primary:    { main: HDFC.red,     dark: HDFC.redDark,  light: HDFC.redLight  },
      secondary:  { main: HDFC.navy,    dark: HDFC.navyDark, light: '#E8EEF8'      },
      background: { default: HDFC.pageBg, paper: HDFC.cardBg },
      text:       { primary: HDFC.text,  secondary: HDFC.subtext, disabled: HDFC.placeholder },
      divider:    HDFC.border,
      success:    { main: HDFC.success,  light: HDFC.successBg,  dark: '#145C35'   },
      error:      { main: HDFC.error,    light: HDFC.errorBg,    dark: '#8B0000'   },
      warning:    { main: HDFC.warning,  light: HDFC.warningBg,  dark: '#7A4000'   },
      info:       { main: HDFC.info,     light: HDFC.infoBg,     dark: '#003E8A'   },
      grey: {
        50:  '#F9FAFB',
        100: '#F4F5F8',
        200: '#ECEEF2',
        300: '#DDE1E7',
        400: '#B0B8C4',
        500: '#8895A2',
        600: '#5A6472',
      },
    },
    typography: {
      fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
      h4:  { fontWeight: 700, color: HDFC.text, fontSize: '1.5rem'  },
      h5:  { fontWeight: 700, color: HDFC.text, fontSize: '1.25rem' },
      h6:  { fontWeight: 700, color: HDFC.text, fontSize: '1.1rem'  },
      subtitle1: { fontWeight: 600, color: HDFC.text,    fontSize: '0.95rem' },
      subtitle2: { fontWeight: 600, color: HDFC.text,    fontSize: '0.85rem' },
      body1:     { color: HDFC.text,    fontSize: '0.875rem' },
      body2:     { color: HDFC.subtext, fontSize: '0.8125rem' },
      caption:   { color: HDFC.subtext, fontSize: '0.75rem'  },
    },
    shape: { borderRadius: 4 },
    shadows: [
      'none',
      '0 1px 3px rgba(0,0,0,0.08)',
      '0 2px 6px rgba(0,0,0,0.08)',
      '0 2px 8px rgba(0,0,0,0.10)',
      '0 4px 12px rgba(0,0,0,0.10)',
      '0 4px 16px rgba(0,0,0,0.12)',
      ...Array(19).fill('0 4px 16px rgba(0,0,0,0.12)'),
    ],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: HDFC.pageBg, color: HDFC.text },
          '*': { boxSizing: 'border-box' },
          '::-webkit-scrollbar': { width: 6, height: 6 },
          '::-webkit-scrollbar-track': { background: HDFC.pageBg },
          '::-webkit-scrollbar-thumb': { background: HDFC.border, borderRadius: 2 },
          '::-webkit-scrollbar-thumb:hover': { background: HDFC.subtext },
          'a': { color: HDFC.navy, textDecoration: 'none' },
          'a:hover': { color: HDFC.red, textDecoration: 'underline' },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true, disableRipple: false },
        styleOverrides: {
          root: {
            borderRadius: 4,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: 13,
            letterSpacing: 0,
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          },
          containedPrimary: {
            backgroundColor: HDFC.red,
            color: '#fff',
            '&:hover': { backgroundColor: HDFC.redDark },
          },
          containedSecondary: {
            backgroundColor: HDFC.navy,
            color: '#fff',
            '&:hover': { backgroundColor: HDFC.navyDark },
          },
          outlinedPrimary: {
            borderColor: HDFC.red,
            color: HDFC.red,
            '&:hover': { backgroundColor: HDFC.redLight, borderColor: HDFC.red },
          },
          outlinedSecondary: {
            borderColor: HDFC.navy,
            color: HDFC.navy,
            '&:hover': { backgroundColor: '#E8EEF8', borderColor: HDFC.navy },
          },
          text: {
            color: HDFC.navy,
            '&:hover': { backgroundColor: '#E8EEF8' },
          },
        },
      },
      MuiTextField: {
        defaultProps: { variant: 'outlined', size: 'small', fullWidth: true },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              backgroundColor: HDFC.white,
              borderRadius: 4,
              fontSize: 13,
              '& fieldset': { borderColor: HDFC.border },
              '&:hover fieldset': { borderColor: '#9AA3AE' },
              '&.Mui-focused fieldset': { borderColor: HDFC.navy, borderWidth: 1.5 },
            },
            '& .MuiInputLabel-root': { color: HDFC.subtext, fontSize: 13 },
            '& .MuiInputLabel-root.Mui-focused': { color: HDFC.navy },
            '& .MuiInputBase-input': { color: HDFC.text, fontSize: 13 },
            '& .MuiFormHelperText-root': { fontSize: 11, marginLeft: 0 },
          },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundColor: HDFC.cardBg,
            borderRadius: 4,
            border: `1px solid ${HDFC.border}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: '16px 20px',
            '&:last-child': { paddingBottom: 16 },
          },
        },
      },
      MuiCardHeader: {
        styleOverrides: {
          root: {
            padding: '14px 20px',
            borderBottom: `1px solid ${HDFC.border}`,
          },
          title: { fontSize: 14, fontWeight: 600, color: HDFC.text },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 3, fontWeight: 600, fontSize: 11, height: 22 },
          colorSuccess: { backgroundColor: HDFC.successBg, color: HDFC.success },
          colorError:   { backgroundColor: HDFC.errorBg,   color: HDFC.error   },
          colorWarning: { backgroundColor: HDFC.warningBg, color: HDFC.warning },
          colorInfo:    { backgroundColor: HDFC.infoBg,    color: HDFC.info    },
          colorDefault: { backgroundColor: HDFC.borderLight, color: HDFC.subtext },
          colorPrimary: { backgroundColor: HDFC.redLight, color: HDFC.red },
          colorSecondary: { backgroundColor: '#E8EEF8', color: HDFC.navy },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 600,
            color: HDFC.subtext,
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            backgroundColor: HDFC.pageBg,
            borderColor: HDFC.border,
            padding: '10px 16px',
          },
          body: {
            borderColor: HDFC.borderLight,
            color: HDFC.text,
            fontSize: 13,
            padding: '10px 16px',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': { backgroundColor: '#FAFBFC' },
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: HDFC.navy,
            color: '#fff',
            width: 240,
            borderRight: 'none',
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            margin: 0,
            width: '100%',
            padding: '10px 20px',
            color: 'rgba(255,255,255,0.75)',
            borderLeft: '3px solid transparent',
            '&.Mui-selected': {
              backgroundColor: 'rgba(255,255,255,0.10)',
              color: '#ffffff',
              borderLeft: `3px solid ${HDFC.red}`,
              '& .MuiListItemIcon-root': { color: '#ffffff' },
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.13)' },
            },
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.06)',
              color: '#fff',
            },
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: {
          root: { minWidth: 34, color: 'rgba(255,255,255,0.6)' },
        },
      },
      MuiDivider: {
        styleOverrides: { root: { borderColor: HDFC.border } },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: HDFC.white,
            borderBottom: `1px solid ${HDFC.border}`,
            boxShadow: 'none',
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 4, fontSize: 13 },
          standardInfo:    { backgroundColor: HDFC.infoBg,    border: `1px solid #B3CDEF`, color: HDFC.info    },
          standardWarning: { backgroundColor: HDFC.warningBg, border: `1px solid #F0C070`, color: HDFC.warning },
          standardError:   { backgroundColor: HDFC.errorBg,   border: `1px solid #F5AAAA`, color: HDFC.error   },
          standardSuccess: { backgroundColor: HDFC.successBg, border: `1px solid #8FCBA8`, color: HDFC.success },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
          outlined: { border: `1px solid ${HDFC.border}` },
          elevation1: { boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: `1px solid ${HDFC.border}` },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: { border: `1px solid ${HDFC.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.10)', borderRadius: 4 },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: { fontSize: 13, color: HDFC.text, '&:hover': { backgroundColor: HDFC.pageBg } },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: { borderBottom: `1px solid ${HDFC.border}`, minHeight: 40 },
          indicator: { backgroundColor: HDFC.red, height: 2 },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: 13,
            color: HDFC.subtext,
            minHeight: 40,
            padding: '8px 16px',
            '&.Mui-selected': { color: HDFC.red, fontWeight: 600 },
          },
        },
      },
      MuiStepper: {
        styleOverrides: {
          root: { backgroundColor: 'transparent' },
        },
      },
      MuiStepLabel: {
        styleOverrides: {
          label: { fontSize: 12, color: HDFC.subtext, '&.Mui-active': { color: HDFC.navy }, '&.Mui-completed': { color: HDFC.success } },
        },
      },
      MuiStepIcon: {
        styleOverrides: {
          root: { color: HDFC.border, '&.Mui-active': { color: HDFC.navy }, '&.Mui-completed': { color: HDFC.success } },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { backgroundColor: HDFC.borderLight, borderRadius: 2, height: 6 },
          bar:  { backgroundColor: HDFC.red, borderRadius: 2 },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          root: { color: HDFC.text, fontSize: 13 },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: { backgroundColor: HDFC.white, fontSize: 13 },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { backgroundColor: HDFC.text, color: '#fff', fontSize: 11, borderRadius: 3 },
        },
      },
      MuiDataGrid: {
        styleOverrides: {
          root: {
            border: `1px solid ${HDFC.border}`,
            borderRadius: 4,
            fontSize: 13,
            '& .MuiDataGrid-cell': { borderColor: HDFC.borderLight },
            '& .MuiDataGrid-columnHeaders': { backgroundColor: HDFC.pageBg, borderColor: HDFC.border },
            '& .MuiDataGrid-row:hover': { backgroundColor: '#FAFBFC' },
            '& .MuiDataGrid-footerContainer': { borderColor: HDFC.border, backgroundColor: HDFC.pageBg },
          },
        },
      },
      MuiBadge: {
        styleOverrides: {
          colorError: { backgroundColor: HDFC.red },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          colorDefault: { backgroundColor: HDFC.redLight, color: HDFC.red, fontWeight: 600 },
        },
      },
    },
  });
};

export const SIDEBAR_COLORS = COLORS;
export const HDFC_COLORS = HDFC;
