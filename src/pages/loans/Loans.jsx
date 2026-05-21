// src/pages/loans/Loans.jsx — MUI, no lucide/tailwind

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Typography, Button, Card, CardContent, TextField, MenuItem, Grid, Alert, Divider, List, ListItem, ListItemText, Collapse, CircularProgress } from '@mui/material';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AddIcon        from '@mui/icons-material/Add';
import CloseIcon      from '@mui/icons-material/Close';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { applyLoan, getMyLoans, calculateEMI, LOAN_TYPES } from '../../services/loanService';
import { rupeesToPaise, paiseToRupees, formatDate } from '../../utils/formatters';
import { LoadingSpinner, StatusChip } from '../../components/ui';

const loanSchema = z.object({
  loanType:       z.enum(['personal','home','education','vehicle','business']),
  amount:         z.string().refine(v=>parseFloat(v)>=1000,'Minimum ₹1,000'),
  durationMonths: z.string().refine(v=>parseInt(v)>=1,'Select duration'),
  purpose:        z.string().min(10,'Describe the purpose (min 10 chars)'),
});

export const Loans = () => {
  const { customerData } = useAuth();
  const [loans,      setLoans]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [previewEMI, setPreviewEMI] = useState(null);

  const { control, handleSubmit, watch, reset, formState:{ errors, isSubmitting } } = useForm({
    resolver: zodResolver(loanSchema),
    defaultValues: { loanType:'personal', amount:'', durationMonths:'12', purpose:'' },
  });

  const wType=watch('loanType'), wAmt=watch('amount'), wDur=watch('durationMonths');

  useEffect(()=>{
    const amt=parseFloat(wAmt), dur=parseInt(wDur), rate=LOAN_TYPES[wType]?.interestRate??12;
    setPreviewEMI(amt>=1000&&dur>0 ? calculateEMI(rupeesToPaise(wAmt),rate,dur) : null);
  },[wAmt,wDur,wType]);

  useEffect(()=>{
    if(!customerData?.uid) return;
    getMyLoans(customerData.uid).then(setLoans).finally(()=>setLoading(false));
  },[customerData]);

  const onSubmit = async(data)=>{
    try{
      await applyLoan(customerData.uid,{ loanType:data.loanType, amountPaise:rupeesToPaise(data.amount), durationMonths:parseInt(data.durationMonths), purpose:data.purpose });
      toast.success('Loan application submitted!');
      setLoans(await getMyLoans(customerData.uid));
      setShowForm(false); reset();
    }catch(err){ toast.error(err.message??'Application failed.'); }
  };

  if(loading) return <LoadingSpinner message="Loading loans…"/>;

  const loanTypeOptions=Object.entries(LOAN_TYPES).map(([k,v])=>({ value:k, label:`${v.label} (${v.interestRate}% p.a.)` }));
  const durationOptions=[6,12,24,36,48,60,84,120].map(m=>({ value:String(m), label:`${m} months${m>=12?` (${m/12} yr${m>12?'s':''})`:''}` }));

  return (
    <Box sx={{ maxWidth:600, display:'flex', flexDirection:'column', gap:3 }}>
      <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <Box>
          <Typography variant="h5" sx={{ display:'flex', alignItems:'center', gap:1 }}>
            <CreditCardIcon/> Loans
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>{loans.length} loan{loans.length!==1?'s':''}</Typography>
        </Box>
        {!showForm&&<Button variant="contained" startIcon={<AddIcon/>} onClick={()=>setShowForm(true)}>Apply for loan</Button>}
      </Box>

      <Collapse in={showForm}>
        <Card>
          <CardContent>
            <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:2 }}>
              <Typography variant="subtitle1" fontWeight={600}>Loan application</Typography>
              <Button size="small" color="inherit" onClick={()=>{ setShowForm(false); reset(); }}><CloseIcon fontSize="small"/></Button>
            </Box>
            <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ display:'flex', flexDirection:'column', gap:2 }}>
              <Controller name="loanType" control={control} render={({field})=>(
                <TextField {...field} select label="Loan type" size="small" fullWidth error={!!errors.loanType} helperText={errors.loanType?.message}>
                  {loanTypeOptions.map(o=><MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </TextField>
              )}/>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Controller name="amount" control={control} render={({field})=>(
                    <TextField {...field} type="number" label="Amount (₹)" size="small" fullWidth error={!!errors.amount} helperText={errors.amount?.message}/>
                  )}/>
                </Grid>
                <Grid item xs={6}>
                  <Controller name="durationMonths" control={control} render={({field})=>(
                    <TextField {...field} select label="Duration" size="small" fullWidth error={!!errors.durationMonths} helperText={errors.durationMonths?.message}>
                      {durationOptions.map(o=><MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                    </TextField>
                  )}/>
                </Grid>
              </Grid>
              <Controller name="purpose" control={control} render={({field})=>(
                <TextField {...field} label="Purpose" size="small" fullWidth multiline rows={2} error={!!errors.purpose} helperText={errors.purpose?.message}/>
              )}/>
              {previewEMI&&(
                <Box sx={{ bgcolor:'primary.light', borderRadius:2, p:2, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Estimated monthly EMI</Typography>
                    <Typography variant="h6" fontWeight={700} color="primary.dark">{paiseToRupees(previewEMI)}</Typography>
                  </Box>
                  <Box sx={{ textAlign:'right' }}>
                    <Typography variant="caption" color="text.secondary" display="block">Rate: {LOAN_TYPES[wType]?.interestRate}% p.a.</Typography>
                    <Typography variant="caption" color="text.secondary">Total: {paiseToRupees(previewEMI*parseInt(wDur||1))}</Typography>
                  </Box>
                </Box>
              )}
              <Button type="submit" variant="contained" size="large" disabled={isSubmitting}
                startIcon={isSubmitting?<CircularProgress size={18} color="inherit"/>:null}>
                {isSubmitting?'Submitting…':'Submit application'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Collapse>

      {loans.length===0 ? (
        <Card><CardContent><Typography variant="body2" color="text.secondary" textAlign="center" py={4}>No loans yet. Apply above to get started.</Typography></CardContent></Card>
      ) : (
        <Box sx={{ display:'flex', flexDirection:'column', gap:2 }}>
          {loans.map(loan=>(
            <Card key={loan.id}>
              <CardContent>
                <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:2 }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ textTransform:'capitalize' }}>{LOAN_TYPES[loan.loanType]?.label??loan.loanType}</Typography>
                    <Typography variant="body2" color="text.secondary">{loan.purpose}</Typography>
                    <Typography variant="caption" color="text.disabled">Applied: {formatDate(loan.appliedAt)}</Typography>
                  </Box>
                  <Box sx={{ textAlign:'right' }}>
                    <Typography variant="h6" fontWeight={700}>{paiseToRupees(loan.amountPaise)}</Typography>
                    <StatusChip status={loan.status}/>
                  </Box>
                </Box>
                <Grid container spacing={1}>
                  {[['Duration',`${loan.durationMonths} months`],['Rate',`${loan.interestRate}% p.a.`],['EMI',paiseToRupees(loan.emiPaise)]].map(([l,v])=>(
                    <Grid item xs={4} key={l}>
                      <Box sx={{ bgcolor:'grey.50', borderRadius:1, p:1, textAlign:'center' }}>
                        <Typography variant="caption" color="text.secondary" display="block">{l}</Typography>
                        <Typography variant="body2" fontWeight={600}>{v}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
                {loan.status==='rejected'&&loan.rejectionReason&&(
                  <Alert severity="error" sx={{ mt:2 }}>Rejection reason: {loan.rejectionReason}</Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
};
