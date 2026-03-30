import { useState } from 'react';
import { Button } from '@strapi/design-system';
import { Sparkle } from '@strapi/icons';
import { useLocation } from 'react-router-dom';
import { AiSeoModal } from './AiSeoModal';

const AiSeoButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Extract uid and documentId from URL
  // Pattern: /content-manager/collection-types/:uid/:documentId
  const pathParts = location.pathname.split('/');
  const collectionTypeIndex = pathParts.indexOf('collection-types');
  const singleTypeIndex = pathParts.indexOf('single-types');

  let uid: string | null = null;
  let documentId: string | null = null;

  if (collectionTypeIndex !== -1) {
    uid = pathParts[collectionTypeIndex + 1] || null;
    documentId = pathParts[collectionTypeIndex + 2] || null;
  } else if (singleTypeIndex !== -1) {
    uid = pathParts[singleTypeIndex + 1] || null;
    documentId = pathParts[singleTypeIndex + 2] || null;
  }

  // Only show on edit view with a real documentId (not "create" for new entries)
  if (!uid || !documentId || documentId === 'create') {
    return null;
  }

  // Extract locale from search params
  const searchParams = new URLSearchParams(location.search);
  const locale = searchParams.get('plugins[i18n][locale]') || undefined;

  return (
    <>
      <Button
        variant="default"
        startIcon={<Sparkle />}
        onClick={() => setIsOpen(true)}
        fullWidth
      >
        AI SEO
      </Button>
      {isOpen && (
        <AiSeoModal
          uid={uid}
          documentId={documentId}
          locale={locale}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export { AiSeoButton };
export default AiSeoButton;
