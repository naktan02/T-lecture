import { ReactElement } from 'react';
import { useForm } from 'react-hook-form';

interface NoticeFormData {
  title: string;
  content: string;
  isPinned?: boolean;
}

interface NoticeFormProps {
  initialData?: NoticeFormData;
  onSubmit: (data: NoticeFormData) => Promise<void>;
  isLoading?: boolean;
  onCancel: () => void;
}

export const NoticeForm = ({
  initialData,
  onSubmit,
  isLoading,
  onCancel,
}: NoticeFormProps): ReactElement => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NoticeFormData>({
    defaultValues: initialData || { title: '', content: '', isPinned: false },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          제목
        </label>
        <input
          type="text"
          id="title"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
          placeholder="공지사항 제목을 입력하세요"
          {...register('title', { required: '제목을 입력해주세요.' })}
        />
        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700">
          내용
        </label>
        <textarea
          id="content"
          rows={10}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
          placeholder="공지사항 내용을 입력하세요"
          {...register('content', { required: '내용을 입력해주세요.' })}
        />
        {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>}
      </div>

      {/* 상단 고정 옵션 */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isPinned"
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          {...register('isPinned')}
        />
        <label htmlFor="isPinned" className="text-sm font-medium text-gray-700">
          📌 상단에 고정
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  );
};
