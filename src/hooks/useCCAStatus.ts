import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type JobStatus = 'queued' | 'running' | 'validated' | 'needs_review' | 'failed';
type ValidationStatus = 'validating' | 'validated' | 'needs_review' | 'failed';

const POLLING_INTERVAL_MS = 10_000;

const TERMINAL_STATUSES: JobStatus[] = ['validated', 'needs_review', 'failed'];
const ACTIVE_STATUSES: JobStatus[] = ['queued', 'running'];

function mapJobStatusToValidationStatus(jobStatus: JobStatus): ValidationStatus {
  if (jobStatus === 'validated') return 'validated';
  if (jobStatus === 'needs_review') return 'needs_review';
  if (jobStatus === 'failed') return 'failed';
  return 'validating'; // 'queued' | 'running'
}

export function useCCAStatus(contractId: string | undefined) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPollingRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isPollingRef.current = false;
  }, []);

  const checkJobStatus = useCallback(async () => {
    if (!contractId) return;

    const { data: job, error } = await supabase
      .from('contract_ai_jobs')
      .select('status, canonical_extraction_id, error')
      .eq('contract_id', contractId)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[useCCAStatus] Error fetching job:', error);
      return;
    }

    if (!job) return;

    const jobStatus = job.status as JobStatus;
    const validationStatus = mapJobStatusToValidationStatus(jobStatus);

    // Always sync the validation_status on the contract
    await supabase
      .from('contratos')
      .update({ validation_status: validationStatus } as any)
      .eq('id', contractId);

    // Stop polling once we reach a terminal state
    if (TERMINAL_STATUSES.includes(jobStatus)) {
      stopPolling();
    }
  }, [contractId, stopPolling]);

  const startPolling = useCallback(() => {
    if (isPollingRef.current || !contractId) return;
    isPollingRef.current = true;

    // Run immediately, then on interval
    checkJobStatus();
    intervalRef.current = setInterval(checkJobStatus, POLLING_INTERVAL_MS);
  }, [contractId, checkJobStatus]);

  useEffect(() => {
    if (!contractId) return;

    // Check current job status to decide whether polling is needed
    supabase
      .from('contract_ai_jobs')
      .select('status')
      .eq('contract_id', contractId)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data: job }) => {
        if (!job) return;
        const jobStatus = job.status as JobStatus;
        if (ACTIVE_STATUSES.includes(jobStatus)) {
          startPolling();
        }
      });

    return () => stopPolling();
  }, [contractId, startPolling, stopPolling]);

  return { startPolling, stopPolling };
}
