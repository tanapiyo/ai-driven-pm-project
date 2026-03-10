/**
 * @layer shared
 * @segment lib/i18n
 * @what アプリケーション文言辞書（日本語）
 *
 * ## 構造ルール
 * - ネストキーを使用（next-intl / react-i18next と互換）
 * - キー名は英語のキャメルケース
 * - 文言は末尾スラッシュなし
 *
 * ## 新規文言追加時のガイドライン
 * → `docs/03_quality/i18n-guidelines.md` を参照
 *
 * ## 将来の i18n ライブラリ移行について
 * このファイルのネスト構造は next-intl / react-i18next と互換性があります。
 * 移行時は辞書オブジェクトをライブラリのメッセージ形式として渡すことができます。
 */

export const dictionary = {
  /** 共通 */
  common: {
    /** アクション系ボタン */
    actions: {
      save: '保存',
      cancel: 'キャンセル',
      close: '閉じる',
      edit: '編集',
      delete: '削除',
      change: '変更',
      retry: 'もう一度試す',
      logout: 'ログアウト',
      loggingOut: 'ログアウト中...',
    },
    /** 状態 */
    status: {
      loading: '読み込み中...',
      error: 'エラー',
      notFound: '見つかりません',
    },
    /** ユーザー */
    user: {
      unknown: '不明なユーザー',
      detail: '詳細',
    },
  },

  /** 認証 */
  auth: {
    login: {
      title: 'ログイン',
      submitting: 'ログイン中...',
      /** フォームフィールド */
      email: {
        label: 'メールアドレス',
        placeholder: 'you@example.com',
        helperText: '例: you@example.com',
      },
      password: {
        label: 'パスワード',
        placeholder: 'パスワードを入力',
        helperText: '8文字以上を推奨',
      },
      /** クイックログイン（デモ） */
      quickLogin: {
        heading: 'クイックログイン (デモ)',
        userButton: 'ユーザー',
        adminButton: 'システム管理者',
        demoNote: 'これはデモ環境です',
      },
    },
  },

  /** ナビゲーション */
  navigation: {
    /** サイドバー */
    sidebar: {
      appName: 'Base App',
      openSidebar: 'サイドバーを開く',
      closeSidebar: 'サイドバーを閉じる',
      mainNav: 'Main navigation',
      adminSection: '管理',
    },
    /** ナビメニューラベル */
    menu: {
      dashboard: 'ダッシュボード',
      settings: '設定',
      adminUsers: 'ユーザー管理',
      adminAuditLogs: '監査ログ',
    },
    /** ブレッドクラム */
    breadcrumb: {
      home: 'ホーム',
      dashboard: 'ダッシュボード',
      admin: '管理者ダッシュボード',
      settings: '設定',
      profile: 'プロフィール',
      new: '新規作成',
      edit: '編集',
      account: 'アカウント',
      appearance: '外観',
      users: 'ユーザー管理',
      auditLogs: '監査ログ',
      dynamicDetail: '詳細',
    },
  },

  /** ダッシュボード */
  dashboard: {
    title: 'ダッシュボード',
    welcome: 'ようこそ、{{name}}さん',
    loggedInAs: '{{role}}としてログイン中',
    selectFeature: '左のメニューから機能を選択してください。',
    /** ロールラベル */
    roles: {
      admin: '管理者',
      user: 'ユーザー',
    },
  },

  /** 設定 */
  settings: {
    /** ナビゲーション */
    nav: {
      account: 'アカウント',
      appearance: '外観',
    },
    /** アカウント情報 */
    account: {
      title: 'アカウント情報',
      fetchError: 'アカウント情報の取得に失敗しました。',
      fields: {
        userId: 'ユーザーID',
        role: 'ロール',
        email: 'メールアドレス',
        password: 'パスワード',
      },
    },
    /** テーマ設定 */
    theme: {
      heading: 'テーマ',
      description: 'アプリケーションの表示モードを選択してください',
      legend: 'テーマを選択',
      options: {
        light: {
          label: 'ライト',
          description: '常にライトモードを使用',
        },
        dark: {
          label: 'ダーク',
          description: '常にダークモードを使用',
        },
        system: {
          label: 'システム設定に従う',
          description: 'OSの設定に合わせて自動切替',
        },
      },
    },
    /** パスワード変更 */
    passwordChange: {
      title: 'パスワードの変更',
      closeButton: '閉じる',
      unsavedChangesConfirm: '変更が保存されていません。閉じてもよろしいですか？',
    },
  },

  /** エラーページ */
  error: {
    unexpected: {
      title: 'エラーが発生しました',
      description: '申し訳ありません。予期しないエラーが発生しました。',
      detailSummary: 'エラー詳細',
    },
    notFound: {
      title: '404 - ページが見つかりません',
      description: 'お探しのページは存在しません。',
    },
  },
} as const;

/** 辞書全体の型 */
export type Dictionary = typeof dictionary;
