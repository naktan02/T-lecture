// src/entities/user/model/useInstructorMeta.ts
import { useState, useEffect } from 'react';
import { getInstructorMeta, InstructorMetaResponse } from '../../../features/auth/authApi';

interface UseInstructorMetaReturn {
  options: InstructorMetaResponse;
  loading: boolean;
  error: string;
}

/**
 * 강사 메타데이터(팀, 직책, 덕목) 로딩 공통 훅
 * - 회원가입, 내 정보 수정 등 어디서든 재사용 가능
 */
export function useInstructorMeta(): UseInstructorMetaReturn {
  const [options, setOptions] = useState<InstructorMetaResponse>({
    virtues: [],
    teams: [],
    categories: [],
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    const fetchOptions = async (): Promise<void> => {
      try {
        setLoading(true);
        const data = await getInstructorMeta();
        if (!cancelled) {
          setOptions(data);
        }
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message || '강사 메타데이터를 불러오는데 실패했습니다.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  return { options, loading, error };
}
