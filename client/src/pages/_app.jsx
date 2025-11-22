import '../styles/globals.css';

// 2. ✅ 캘린더 스타일을 여기서 불러오세요! (경로 주의)
// (InstructorCalendar.jsx 파일 기준으로는 ../styles 였으니, features 폴더 안에 있다는 뜻입니다)
import '../features/schedule/styles/Calendar.css';

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />
}
