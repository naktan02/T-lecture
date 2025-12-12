import { useState, useEffect } from 'react';

export const useAssignment = () => {
    // 기본값: 오늘부터 1주일 뒤
    const [dateRange, setDateRange] = useState({
        startDate: new Date(),
        endDate: new Date(new Date().setDate(new Date().getDate() + 7))
    });

    const [loading, setLoading] = useState(false);
    const [unassignedUnits, setUnassignedUnits] = useState([]);
    const [availableInstructors, setAvailableInstructors] = useState([]);

    // 날짜가 변경되면 데이터 다시 조회 (Mock API)
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // TODO: 실제 API 호출로 대체 (예: axios.get('/api/assignments/targets', { params: dateRange }))
                await new Promise(resolve => setTimeout(resolve, 800)); // 0.8초 딜레이 시뮬레이션

                // Mock Data: 배정 대상 부대
                setUnassignedUnits([
                    { id: 1, date: '2025-11-02', time: '14:00', unitName: '1사단 신교대', location: '파주', reqMain: 1, reqSub: 1 },
                    { id: 2, date: '2025-11-03', time: '09:00', unitName: '9사단 본부', location: '고양', reqMain: 1, reqSub: 0 },
                    { id: 3, date: '2025-11-05', time: '10:00', unitName: '25사단', location: '양주', reqMain: 1, reqSub: 2 },
                ]);

                // Mock Data: 가용 강사
                setAvailableInstructors([
                    { id: 101, name: '김푸른', role: '주강사', location: '서울 마포', availableDates: ['11.02', '11.03', '11.05'] },
                    { id: 102, name: '이나무', role: '보조강사', location: '경기 고양', availableDates: ['11월 전체'] },
                    { id: 103, name: '최예비', role: '본부/예비', location: '본부', availableDates: ['상시'] },
                ]);

            } catch (error) {
                console.error("Failed to fetch assignment data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dateRange]);

    return {
        dateRange,
        setDateRange,
        loading,
        unassignedUnits,
        availableInstructors
    };
};
