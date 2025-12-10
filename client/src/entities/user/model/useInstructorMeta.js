// src/entities/user/model/useInstructorMeta.js
import { useState, useEffect } from "react";
import { getInstructorMeta } from "../../../features/auth/authApi";

/**
 * 강사 메타데이터(팀, 직책, 덕목) 로딩 공통 훅
 * - 회원가입, 내 정보 수정 등 어디서든 재사용 가능
 */
export function useInstructorMeta() {
    const [options, setOptions] = useState({
        virtues: [],
        teams: [],
        categories: [],
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        const fetchOptions = async () => {
        try {
            setLoading(true);
            const data = await getInstructorMeta(); // { virtues, teams, categories }
            if (!cancelled) {
            setOptions(data);
            }
        } catch (e) {
            if (!cancelled) {
            setError(
                e.message || "강사 메타데이터를 불러오는데 실패했습니다."
            );
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
