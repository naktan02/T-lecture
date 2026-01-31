
import 'dotenv/config';
import prisma from '../src/libs/prisma.js';
import ExcelJS from 'exceljs';

async function exportUnits() {
    console.log('📦 Seeded 부대 데이터 엑셀 추출 시작...');

    const units = await prisma.unit.findMany({
        where: { lectureYear: 2026 },
        include: {
            trainingPeriods: {
                include: {
                    locations: {
                        include: {
                            scheduleLocations: true
                        }
                    },
                    schedules: {
                        orderBy: { date: 'asc' }
                    }
                }
            }
        }
    });

    if (units.length === 0) {
        console.warn('⚠️ 2026년도 부대 데이터가 없습니다. 먼저 seedUnits.ts를 실행하세요.');
        return;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Units');

    // Headers
    sheet.addRow(['강의년도', 2026]);
    sheet.addRow([]); // Blank
    
    // Header Row (This must match ExcelService.COLUMN_MAPPING keys)
    const headers = [
        '부대명', '군구분', '광역', '지역', '부대주소', '부대상세주소',
        '교육시작일자', '교육종료일자', '교육불가일자',
        '근무시작시간', '근무종료시간', '점심시작시간', '점심종료시간',
        '간부명', '간부 전화번호', '간부 이메일 주소',
        '기존교육장소', '변경교육장소', '강사휴게실 여부', '여자화장실 여부',
        '수탁급식여부', '회관숙박여부', '사전사후 휴대폰 불출 여부',
        '계획인원', '참여인원', '특이사항'
    ];
    sheet.addRow(headers);

    for (const unit of units) {
        const period = unit.trainingPeriods[0];
        if (!period) continue;

        const formatDate = (d: Date | null) => d ? d.toISOString().split('T')[0] : '';
        const formatTime = (d: Date | null | undefined) => {
            if (!d) return '';
            const dateObj = new Date(d);
            const hours = dateObj.getUTCHours().toString().padStart(2, '0');
            const minutes = dateObj.getUTCMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
        };

        const startDate = period.schedules[0]?.date;
        const endDate = period.schedules[period.schedules.length - 1]?.date;
        const excludedDates = (period.excludedDates as string[] || []).join(', ');

        for (const loc of period.locations) {
            const firstScheduleLoc = loc.scheduleLocations[0];
            
            sheet.addRow([
                unit.name,
                unit.unitType,
                unit.wideArea,
                unit.region,
                unit.addressDetail,
                unit.detailAddress,
                formatDate(startDate),
                formatDate(endDate),
                excludedDates,
                formatTime(period.workStartTime),
                formatTime(period.workEndTime),
                formatTime(period.lunchStartTime),
                formatTime(period.lunchEndTime),
                period.officerName,
                period.officerPhone,
                period.officerEmail,
                loc.originalPlace,
                loc.changedPlace,
                loc.hasInstructorLounge ? 'O' : 'X',
                loc.hasWomenRestroom ? 'O' : 'X',
                period.hasCateredMeals ? 'O' : 'X',
                period.hasHallLodging ? 'O' : 'X',
                period.allowsPhoneBeforeAfter ? 'O' : 'X',
                firstScheduleLoc?.plannedCount,
                firstScheduleLoc?.actualCount,
                loc.note
            ]);
        }
    }

    // Set column widths
    sheet.columns.forEach(column => {
        column.width = 15;
    });

    const filename = '../seeded_units_2026.xlsx';
    await workbook.xlsx.writeFile(filename);
    console.log(`✅ 엑셀 파일 생성 완료: ${filename}`);
}

exportUnits()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
