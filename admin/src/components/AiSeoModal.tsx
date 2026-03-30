import { useState, useCallback } from 'react';
import {
  Modal,
  Button,
  Typography,
  Flex,
  Box,
  Loader,
  Badge,
  Tabs,
  TextInput,
  Textarea,
  Toggle,
  Alert,
  IconButton,
} from '@strapi/design-system';
import { Duplicate, Check, Sparkle } from '@strapi/icons';
import { useFetchClient } from '@strapi/strapi/admin';
import { PLUGIN_ID } from '../pluginId';

interface AiSeoModalProps {
  uid: string;
  documentId: string;
  locale?: string;
  onClose: () => void;
}

interface CopiedState {
  [key: string]: boolean;
}

const AiSeoModal = ({ uid, documentId, locale, onClose }: AiSeoModalProps) => {
  const { post } = useFetchClient();

  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [seoData, setSeoData] = useState<any>(null);
  const [structureType, setStructureType] = useState<string>('none');
  const [copied, setCopied] = useState<CopiedState>({});

  const copyToClipboard = useCallback(async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopied((prev) => ({ ...prev, [key]: false }));
      }, 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopied((prev) => ({ ...prev, [key]: false }));
      }, 2000);
    }
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await post(`/${PLUGIN_ID}/generate`, {
        uid,
        documentId,
        locale,
      });

      const data = response.data;
      setSeoData(data.seoData);
      setStructureType(data.structureType);
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || err?.message || 'Failed to generate SEO tags';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!seoData) return;

    setApplying(true);
    setError(null);
    setSuccess(null);

    try {
      await post(`/${PLUGIN_ID}/apply`, {
        uid,
        documentId,
        locale,
        seoData,
        targetField: structureType === 'yoastHeadJson' ? 'yoastHeadJson' : 'seo',
      });

      setSuccess('SEO data applied successfully! Refresh the page to see changes.');
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || err?.message || 'Failed to apply SEO data';
      setError(message);
    } finally {
      setApplying(false);
    }
  };

  const CopyButton = ({ value, copyKey }: { value: string; copyKey: string }) => (
    <IconButton
      label={copied[copyKey] ? 'Copied!' : 'Copy'}
      onClick={() => copyToClipboard(value, copyKey)}
      variant="ghost"
      style={{ marginLeft: '4px' }}
    >
      {copied[copyKey] ? <Check /> : <Duplicate />}
    </IconButton>
  );

  const renderField = (label: string, value: any, key: string) => {
    if (value === undefined || value === null) return null;
    const strValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);

    return (
      <Box paddingBottom={3} key={key}>
        <Flex justifyContent="space-between" alignItems="center" paddingBottom={1}>
          <Typography variant="pi" fontWeight="bold" textColor="neutral800">
            {label}
          </Typography>
          <CopyButton value={strValue} copyKey={key} />
        </Flex>
        {strValue.length > 100 || strValue.includes('\n') ? (
          <Textarea
            value={strValue}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
              // Allow editing in the modal
              const newData = { ...seoData };
              const keys = key.split('.');
              let target = newData;
              for (let i = 0; i < keys.length - 1; i++) {
                target = target[keys[i]];
              }
              try {
                target[keys[keys.length - 1]] = JSON.parse(e.target.value);
              } catch {
                target[keys[keys.length - 1]] = e.target.value;
              }
              setSeoData(newData);
            }}
            style={{ fontFamily: 'monospace', fontSize: '13px' }}
          />
        ) : (
          <TextInput
            value={strValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const newData = { ...seoData };
              const keys = key.split('.');
              let target = newData;
              for (let i = 0; i < keys.length - 1; i++) {
                target = target[keys[i]];
              }
              target[keys[keys.length - 1]] = e.target.value;
              setSeoData(newData);
            }}
          />
        )}
      </Box>
    );
  };

  const renderYoastView = () => {
    if (!seoData) return null;

    return (
      <Tabs.Root defaultValue="meta">
        <Tabs.List>
          <Tabs.Trigger value="meta">Meta Tags</Tabs.Trigger>
          <Tabs.Trigger value="og">Open Graph</Tabs.Trigger>
          <Tabs.Trigger value="twitter">Twitter</Tabs.Trigger>
          <Tabs.Trigger value="robots">Robots</Tabs.Trigger>
          <Tabs.Trigger value="schema">Schema</Tabs.Trigger>
          <Tabs.Trigger value="json">Full JSON</Tabs.Trigger>
        </Tabs.List>

        <Box paddingTop={4}>
          <Tabs.Content value="meta">
            {renderField('Title', seoData.title, 'title')}
            {renderField('Description', seoData.description, 'description')}
            {renderField('Keywords', seoData.keywords, 'keywords')}
            {renderField('Canonical URL', seoData.canonical, 'canonical')}
          </Tabs.Content>

          <Tabs.Content value="og">
            {renderField('OG Title', seoData.og_title, 'og_title')}
            {renderField('OG Description', seoData.og_description, 'og_description')}
            {renderField('OG Type', seoData.og_type, 'og_type')}
            {renderField('OG Locale', seoData.og_locale, 'og_locale')}
            {renderField('OG Site Name', seoData.og_site_name, 'og_site_name')}
            {seoData.og_image && renderField('OG Image', seoData.og_image, 'og_image')}
          </Tabs.Content>

          <Tabs.Content value="twitter">
            {renderField('Twitter Card', seoData.twitter_card, 'twitter_card')}
            {seoData.twitter_misc && renderField('Twitter Misc', seoData.twitter_misc, 'twitter_misc')}
          </Tabs.Content>

          <Tabs.Content value="robots">
            {seoData.robots && (
              <>
                {renderField('Index', seoData.robots.index, 'robots.index')}
                {renderField('Follow', seoData.robots.follow, 'robots.follow')}
                {renderField('Max Snippet', seoData.robots['max-snippet'], 'robots.max-snippet')}
                {renderField('Max Image Preview', seoData.robots['max-image-preview'], 'robots.max-image-preview')}
                {renderField('Max Video Preview', seoData.robots['max-video-preview'], 'robots.max-video-preview')}
              </>
            )}
          </Tabs.Content>

          <Tabs.Content value="schema">
            {seoData.schema && renderField('Schema Markup', seoData.schema, 'schema')}
          </Tabs.Content>

          <Tabs.Content value="json">
            <Box paddingBottom={2}>
              <Flex justifyContent="flex-end" paddingBottom={2}>
                <CopyButton
                  value={JSON.stringify(seoData, null, 2)}
                  copyKey="full-json"
                />
              </Flex>
              <Textarea
                value={JSON.stringify(seoData, null, 2)}
                disabled
                style={{ fontFamily: 'monospace', fontSize: '12px', minHeight: '400px' }}
              />
            </Box>
          </Tabs.Content>
        </Box>
      </Tabs.Root>
    );
  };

  const renderSeoComponentView = () => {
    if (!seoData) return null;

    return (
      <Tabs.Root defaultValue="meta">
        <Tabs.List>
          <Tabs.Trigger value="meta">Meta Tags</Tabs.Trigger>
          <Tabs.Trigger value="og">OG & Twitter Tags</Tabs.Trigger>
          <Tabs.Trigger value="schema">Schema</Tabs.Trigger>
          <Tabs.Trigger value="json">Full JSON</Tabs.Trigger>
        </Tabs.List>

        <Box paddingTop={4}>
          <Tabs.Content value="meta">
            {renderField('Title', seoData.title, 'title')}
            {renderField('Description', seoData.description, 'description')}
            {renderField('Keywords', seoData.keywords, 'keywords')}
            {renderField('Canonical URL', seoData.canonicalURL, 'canonicalURL')}
            <Box paddingBottom={3}>
              <Flex gap={4}>
                <Box>
                  <Typography variant="pi" fontWeight="bold" textColor="neutral800">
                    No Index
                  </Typography>
                  <Box paddingTop={1}>
                    <Toggle
                      checked={seoData.noindex || false}
                      onChange={() => {
                        setSeoData({ ...seoData, noindex: !seoData.noindex });
                      }}
                      onLabel="Yes"
                      offLabel="No"
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="pi" fontWeight="bold" textColor="neutral800">
                    No Follow
                  </Typography>
                  <Box paddingTop={1}>
                    <Toggle
                      checked={seoData.nofollow || false}
                      onChange={() => {
                        setSeoData({ ...seoData, nofollow: !seoData.nofollow });
                      }}
                      onLabel="Yes"
                      offLabel="No"
                    />
                  </Box>
                </Box>
              </Flex>
            </Box>
          </Tabs.Content>

          <Tabs.Content value="og">
            {seoData.ogGroup && Array.isArray(seoData.ogGroup) && (
              <>
                {seoData.ogGroup.map((og: any, index: number) => (
                  <Box
                    key={index}
                    paddingBottom={3}
                    style={{
                      borderBottom: '1px solid #eaeaea',
                      marginBottom: '12px',
                      paddingBottom: '12px',
                    }}
                  >
                    <Flex justifyContent="space-between" alignItems="center" paddingBottom={1}>
                      <Badge>{og.property || og.name || `Tag ${index + 1}`}</Badge>
                      <CopyButton
                        value={`<meta property="${og.property}" content="${og.content}" />`}
                        copyKey={`og-${index}`}
                      />
                    </Flex>
                    <Box paddingTop={1}>
                      <TextInput
                        label="Content"
                        value={og.content || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const newOgGroup = [...seoData.ogGroup];
                          newOgGroup[index] = { ...newOgGroup[index], content: e.target.value };
                          setSeoData({ ...seoData, ogGroup: newOgGroup });
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </>
            )}
          </Tabs.Content>

          <Tabs.Content value="schema">
            {seoData.schema && Array.isArray(seoData.schema) && (
              <>
                {seoData.schema.map((s: any, index: number) => (
                  <Box
                    key={index}
                    paddingBottom={3}
                    style={{
                      borderBottom: '1px solid #eaeaea',
                      marginBottom: '12px',
                      paddingBottom: '12px',
                    }}
                  >
                    <Flex justifyContent="space-between" alignItems="center" paddingBottom={2}>
                      <Flex gap={2}>
                        <Badge>{s.title || `Schema ${index + 1}`}</Badge>
                        <Typography variant="pi" textColor="neutral600">
                          {s.type}
                        </Typography>
                      </Flex>
                      <CopyButton
                        value={
                          typeof s.schema === 'string'
                            ? s.schema
                            : JSON.stringify(s.schema, null, 2)
                        }
                        copyKey={`schema-${index}`}
                      />
                    </Flex>
                    <Textarea
                      value={
                        typeof s.schema === 'string'
                          ? s.schema
                          : JSON.stringify(s.schema, null, 2)
                      }
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                        const newSchema = [...seoData.schema];
                        try {
                          newSchema[index] = {
                            ...newSchema[index],
                            schema: JSON.parse(e.target.value),
                          };
                        } catch {
                          newSchema[index] = { ...newSchema[index], schema: e.target.value };
                        }
                        setSeoData({ ...seoData, schema: newSchema });
                      }}
                      style={{ fontFamily: 'monospace', fontSize: '12px', minHeight: '150px' }}
                    />
                  </Box>
                ))}
              </>
            )}
          </Tabs.Content>

          <Tabs.Content value="json">
            <Box paddingBottom={2}>
              <Flex justifyContent="flex-end" paddingBottom={2}>
                <CopyButton
                  value={JSON.stringify(seoData, null, 2)}
                  copyKey="full-json"
                />
              </Flex>
              <Textarea
                value={JSON.stringify(seoData, null, 2)}
                disabled
                style={{ fontFamily: 'monospace', fontSize: '12px', minHeight: '400px' }}
              />
            </Box>
          </Tabs.Content>
        </Box>
      </Tabs.Root>
    );
  };

  return (
    <Modal.Root open onOpenChange={onClose}>
      <Modal.Content
        style={{
          width: '80vw',
          maxWidth: '900px',
          height: '85vh',
          maxHeight: '85vh',
        }}
      >
        <Modal.Header>
          <Flex justifyContent="space-between" width="100%" alignItems="center">
            <Modal.Title>
              <Flex gap={2} alignItems="center">
                <Sparkle />
                <Typography variant="alpha" fontWeight="bold">
                  AI SEO Generator
                </Typography>
              </Flex>
            </Modal.Title>
            {structureType !== 'none' && seoData && (
              <Badge>
                {structureType === 'yoastHeadJson' ? 'Yoast Head JSON' : 'SEO Component'}
              </Badge>
            )}
          </Flex>
        </Modal.Header>

        <Modal.Body style={{ padding: '16px 24px' }}>
          {error && (
            <Box paddingBottom={4}>
              <Alert
                variant="danger"
                title="Error"
                onClose={() => setError(null)}
                closeLabel="Close"
              >
                {error}
              </Alert>
            </Box>
          )}

          {success && (
            <Box paddingBottom={4}>
              <Alert
                variant="success"
                title="Success"
                onClose={() => setSuccess(null)}
                closeLabel="Close"
              >
                {success}
              </Alert>
            </Box>
          )}

          {!seoData && !loading && (
            <Flex
              direction="column"
              alignItems="center"
              justifyContent="center"
              padding={8}
              gap={4}
            >
              <Sparkle style={{ width: '48px', height: '48px' }} />
              <Typography variant="beta" textColor="neutral800">
                Generate SEO Tags with AI
              </Typography>
              <Typography variant="omega" textColor="neutral600" style={{ textAlign: 'center' }}>
                Click the button below to analyze this entry's content and generate
                optimized SEO metadata including meta tags, Open Graph tags, Twitter cards,
                and schema markup.
              </Typography>
              <Box paddingTop={2}>
                <Button
                  onClick={handleGenerate}
                  startIcon={<Sparkle />}
                  size="L"
                  loading={loading}
                >
                  Generate SEO Tags
                </Button>
              </Box>
            </Flex>
          )}

          {loading && (
            <Flex
              direction="column"
              alignItems="center"
              justifyContent="center"
              padding={8}
              gap={4}
            >
              <Loader />
              <Typography variant="omega" textColor="neutral600">
                Analyzing content and generating SEO tags...
              </Typography>
            </Flex>
          )}

          {seoData && !loading && (
            <>
              {structureType === 'yoastHeadJson' ? renderYoastView() : renderSeoComponentView()}
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Flex justifyContent="space-between" width="100%">
            <Modal.Close>
              <Button variant="tertiary">Close</Button>
            </Modal.Close>
            <Flex gap={2}>
              {seoData && (
                <>
                  <Button
                    onClick={handleGenerate}
                    variant="secondary"
                    startIcon={<Sparkle />}
                    loading={loading}
                  >
                    Regenerate
                  </Button>
                  <Button
                    onClick={handleApply}
                    variant="success"
                    startIcon={<Check />}
                    loading={applying}
                    disabled={structureType === 'none'}
                  >
                    Apply to Entry
                  </Button>
                </>
              )}
            </Flex>
          </Flex>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export { AiSeoModal };
export default AiSeoModal;
