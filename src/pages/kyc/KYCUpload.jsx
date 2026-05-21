// src/pages/kyc/KYCUpload.jsx — MUI, no lucide/tailwind

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Typography, Card, CardContent, TextField, MenuItem, Button, Alert, Stepper, Step, StepLabel, CircularProgress, Grid, Divider } from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import CheckCircleIcon  from '@mui/icons-material/CheckCircle';
import CancelIcon       from '@mui/icons-material/Cancel';
import HourglassIcon    from '@mui/icons-material/HourglassEmpty';
import RefreshIcon      from '@mui/icons-material/Refresh';
import toast from 'react-hot-toast';
import { useAuth }  from '../../context/AuthContext';
import { submitKYC, getKYC } from '../../services/kycService';
import { LoadingSpinner } from '../../components/ui';

const schema = z.object({
  fullName:     z.string().min(2,'Full name required'),
  pan:          z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,'Invalid PAN (e.g. ABCDE1234F)'),
  aadhaarLast4: z.string().regex(/^\d{4}$/,'Enter last 4 digits of Aadhaar'),
  dob:          z.string().min(1,'Date of birth required'),
  address:      z.string().min(10,'Enter your full address'),
  docType:      z.enum(['aadhaar','pan','passport','driving_license']),
});

const STATUS_CFG = {
  pending:  { Icon:HourglassIcon,  severity:'warning', title:'KYC under review',  message:'Your documents are being reviewed. We will notify you within 1–2 business days.' },
  hold:     { Icon:HourglassIcon,  severity:'warning', title:'KYC on hold',        message:null },
  approved: { Icon:CheckCircleIcon,severity:'success', title:'KYC approved!',      message:'Your identity has been verified. Your account will be set up shortly.' },
  rejected: { Icon:CancelIcon,     severity:'error',   title:'KYC rejected',       message:null },
};

const steps = ['Submit KYC','Under review','Account active'];
const docTypes = [
  {value:'aadhaar',label:'Aadhaar Card'},{value:'pan',label:'PAN Card'},
  {value:'passport',label:'Passport'},{value:'driving_license',label:'Driving License'},
];

export const KYCUpload = () => {
  const { user, customerData, refreshCustomer } = useAuth();
  const navigate  = useNavigate();
  const [kyc,     setKyc]     = useState(null);
  const [loading, setLoading] = useState(true);

  const { control, handleSubmit, formState:{ errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fullName:customerData?.fullName??'', pan:'', aadhaarLast4:'', dob:'', address:'', docType:'aadhaar' },
  });

  useEffect(()=>{ if(user) getKYC(user.uid).then(setKyc).finally(()=>setLoading(false)); },[user]);

  const onSubmit = async(data)=>{
    try{
      await submitKYC(user.uid,data);
      toast.success('KYC submitted! We will review it shortly.');
      const updated = await getKYC(user.uid);
      setKyc(updated); refreshCustomer?.();
    }catch(err){ toast.error(err.message??'Submission failed.'); }
  };

  if(loading) return <LoadingSpinner message="Loading KYC status…"/>;

  if(kyc){
    const cfg = STATUS_CFG[kyc.status]??STATUS_CFG.pending;
    return (
      <Box sx={{ maxWidth:560, display:'flex', flexDirection:'column', gap:3 }}>
        <Typography variant="h5" sx={{ display:'flex', alignItems:'center', gap:1 }}>
          <VerifiedUserIcon/> KYC Verification
        </Typography>
        <Stepper activeStep={kyc.status==='approved'?2:1} alternativeLabel>
          {steps.map(l=><Step key={l}><StepLabel>{l}</StepLabel></Step>)}
        </Stepper>
        <Alert severity={cfg.severity}>
          <Typography fontWeight={600}>{cfg.title}</Typography>
          <Typography variant="body2" mt={0.5}>{cfg.message??kyc.rejectionReason??kyc.holdReason??''}</Typography>
        </Alert>
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} mb={2}>Submitted details</Typography>
            {[['Name',kyc.fullName],['PAN',kyc.pan],['Aadhaar',`••••••••${kyc.aadhaarLast4}`],['DOB',kyc.dob],['Doc type',kyc.docType?.replace('_',' ')],['Address',kyc.address]].map(([l,v],i,arr)=>(
              <Box key={l}>
                <Box sx={{ display:'flex', justifyContent:'space-between', py:1 }}>
                  <Typography variant="body2" color="text.secondary">{l}</Typography>
                  <Typography variant="body2" fontWeight={500} sx={{ textTransform:'capitalize' }}>{v}</Typography>
                </Box>
                {i<arr.length-1&&<Divider/>}
              </Box>
            ))}
          </CardContent>
        </Card>
        {(kyc.status==='rejected'||kyc.status==='hold')&&(
          <Button variant="outlined" startIcon={<RefreshIcon/>} onClick={()=>setKyc(null)}>Resubmit documents</Button>
        )}
        {kyc.status==='approved'&&(
          <Button variant="contained" onClick={()=>navigate('/dashboard')}>Go to dashboard</Button>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth:560, display:'flex', flexDirection:'column', gap:3 }}>
      <Box>
        <Typography variant="h5" sx={{ display:'flex', alignItems:'center', gap:1 }}>
          <VerifiedUserIcon/> KYC Verification
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Submit your identity documents for verification.
        </Typography>
      </Box>
      <Stepper activeStep={0} alternativeLabel>
        {steps.map(l=><Step key={l}><StepLabel>{l}</StepLabel></Step>)}
      </Stepper>
      <Alert severity="info">We only store the last 4 digits of your Aadhaar. All information is stored securely.</Alert>
      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>Personal details</Typography>
          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display:'flex', flexDirection:'column', gap:2 }}>
            <Controller name="fullName" control={control} render={({field})=>(
              <TextField {...field} label="Full name (as per documents)" size="small" fullWidth error={!!errors.fullName} helperText={errors.fullName?.message}/>
            )}/>
            <Controller name="pan" control={control} render={({field})=>(
              <TextField {...field} label="PAN number" size="small" fullWidth placeholder="ABCDE1234F"
                inputProps={{ style:{textTransform:'uppercase'} }} error={!!errors.pan} helperText={errors.pan?.message}/>
            )}/>
            <Controller name="aadhaarLast4" control={control} render={({field})=>(
              <TextField {...field} label="Aadhaar — last 4 digits only" size="small" fullWidth placeholder="5678"
                inputProps={{ maxLength:4 }} error={!!errors.aadhaarLast4} helperText={errors.aadhaarLast4?.message??'We never store your full Aadhaar number.'}/>
            )}/>
            <Controller name="dob" control={control} render={({field})=>(
              <TextField {...field} label="Date of birth" type="date" size="small" fullWidth InputLabelProps={{ shrink:true }} error={!!errors.dob} helperText={errors.dob?.message}/>
            )}/>
            <Controller name="address" control={control} render={({field})=>(
              <TextField {...field} label="Residential address" size="small" fullWidth multiline rows={2}
                placeholder="Flat 4B, 12 Main Street, Chennai 600001" error={!!errors.address} helperText={errors.address?.message}/>
            )}/>
            <Controller name="docType" control={control} render={({field})=>(
              <TextField {...field} select label="Primary ID document type" size="small" fullWidth error={!!errors.docType} helperText={errors.docType?.message}>
                {docTypes.map(d=><MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
              </TextField>
            )}/>
            <Button type="submit" variant="contained" size="large" disabled={isSubmitting}
              startIcon={isSubmitting?<CircularProgress size={18} color="inherit"/>:<VerifiedUserIcon/>}>
              {isSubmitting?'Submitting…':'Submit KYC'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
