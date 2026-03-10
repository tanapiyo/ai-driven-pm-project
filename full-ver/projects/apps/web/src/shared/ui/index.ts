/**
 * @layer shared
 * @segment ui
 * @what 共通 UI コンポーネントの集約
 */
export { Button } from './Button';
export { ErrorFallback } from './ErrorFallback';
export { FormField } from './Form';
export { Breadcrumb, type BreadcrumbItem, type BreadcrumbProps } from './Breadcrumb';
export { EditPageLayout, type EditPageLayoutProps } from './EditPageLayout';
export { Dialog, type DialogProps } from './Dialog';
export { ConfirmationDialog, type ConfirmationDialogProps } from './ConfirmationDialog';
export {
  UnsavedChangesGuard,
  useNavigationGuard,
  type UnsavedChangesGuardProps,
} from './UnsavedChangesGuard';
export { ToastProvider, useToast, type ToastVariant, type ToastOptions } from './Toast';
export { Skeleton, SkeletonTable, SkeletonCard, SkeletonDetail } from './Skeleton';
export { Spinner, PageSpinner, InlineSpinner, ButtonSpinner, type SpinnerVariant } from './Spinner';
export {
  EmptyState,
  type EmptyStateProps,
  type EmptyStateVariant,
  type EmptyStateAction,
} from './EmptyState';
export {
  Pagination,
  PAGE_SIZE_OPTIONS,
  DEFAULT_PAGE_SIZE,
  type PaginationProps,
  type PageSizeOption,
} from './Pagination';
