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
  Checkbox,
} from '@strapi/design-system';
import { Duplicate, Check, Sparkle, ArrowLeft } from '@strapi/icons';
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

const TOP_12_SCHEMAS = [
  { value: 'Article', label: 'Article' },
  { value: 'BlogPosting', label: 'BlogPosting' },
  { value: 'Product', label: 'Product' },
  { value: 'FAQPage', label: 'FAQPage' },
  { value: 'Organization', label: 'Organization' },
  { value: 'LocalBusiness', label: 'LocalBusiness' },
  { value: 'WebPage', label: 'WebPage' },
  { value: 'BreadcrumbList', label: 'BreadcrumbList' },
  { value: 'HowTo', label: 'HowTo' },
  { value: 'Event', label: 'Event' },
  { value: 'Person', label: 'Person' },
  { value: 'Service', label: 'Service' },
];

const SEO_FIELDS = [
  { key: 'title', label: 'Title' },
  { key: 'description', label: 'Meta Description' },
  { key: 'keywords', label: 'Keywords' },
  { key: 'canonical', label: 'Canonical URL' },
  { key: 'robots', label: 'Robots Directives' },
  { key: 'openGraph', label: 'Open Graph Tags' },
  { key: 'twitterCard', label: 'Twitter Card' },
  { key: 'schema', label: 'Schema Markup' },
];

const AiSeoModal = ({ uid, documentId, locale, onClose }: AiSeoModalProps) => {
  const { post } = useFetchClient();

  // Step: 'config' = step 1, 'result' = step 2
  const [step, setStep] = useState<'config' | 'result'>('config');
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [seoData, setSeoData] = useState<any>(null);
  const [structureType, setStructureType] = useState<string>('none');
  const [copied, setCopied] = useState<CopiedState>({});

  // Step 1 config state
  const [pageInstructions, setPageInstructions] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>(
    SEO_FIELDS.map((f) => f.key)
  );
  const [selectedSchemas, setSelectedSchemas] = useState<string[]>(
    TOP_12_SCHEMAS.map((s) => s.value)
  );
  const [customSchemas, setCustomSchemas] = useState('');

  const copyToClipboard = useCallback(async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => setCopied((prev) => ({ ...prev, [key]: false })), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => setCopied((prev) => ({ ...prev, [key]: false })), 2000);
    }
  }, []);

  const handleGenerate = async () => {
    setStep('result');
    setLoading(true);
    setError(null);
    setSuccess(null);
    setSeoData(null);

    try {
      const response = await post(`/${PLUGIN_ID}/generate`, {
        uid,
        documentId,
        locale,
        pageInstructions,
        selectedFields,
        schemaTypes: selectedSchemas,
        customSchemas,
      });

      const data = response.data;
      setSeoData(data.seoData);
      setStructureType(data.structureType);
    } catch (err: any) {
      const message =
        err?.response?.data?.error?.message || err?.message || 'Failed to generate SEO tags';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setSeoData(null);

    try {
      const response = await post(`/${PLUGIN_ID}/generate`, {
        uid,
        documentId,
        locale,
        pageInstructions,
        selectedFields,
        schemaTypes: selectedSchemas,
        customSchemas,
      });

      const data = response.data;
      setSeoData(data.seoData);
      setStructureType(data.structureType);
    } catch (err: any) {
      const message =
        err?.response?.data?.error?.message || err?.message || 'Failed to generate SEO tags';
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

      setSuccess('SEO data applied successfully! Reloading...');
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 500);
    } catch (err: any) {
      const message =
        err?.response?.data?.error?.message || err?.message || 'Failed to apply SEO data';
      setError(message);
    } finally {
      setApplying(false);
    }
  };

  const handleBack = () => {
    setStep('config');
    setError(null);
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
              const newData = { ...seoData };
              const keys = key.split('.');
              let target = newData;
              for (let i = 0; i < keys.length - 1; i++) target = target[keys[i]];
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
              for (let i = 0; i < keys.length - 1; i++) target = target[keys[i]];
              target[keys[keys.length - 1]] = e.target.value;
              setSeoData(newData);
            }}
          />
        )}
      </Box>
    );
  };

  const renderYoastView = () => (
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
              <CopyButton value={JSON.stringify(seoData, null, 2)} copyKey="full-json" />
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

  const renderSeoComponentView = () => (
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
                <Typography variant="pi" fontWeight="bold" textColor="neutral800">No Index</Typography>
                <Box paddingTop={1}>
                  <Toggle
                    checked={seoData.noindex || false}
                    onChange={() => setSeoData({ ...seoData, noindex: !seoData.noindex })}
                    onLabel="Yes"
                    offLabel="No"
                  />
                </Box>
              </Box>
              <Box>
                <Typography variant="pi" fontWeight="bold" textColor="neutral800">No Follow</Typography>
                <Box paddingTop={1}>
                  <Toggle
                    checked={seoData.nofollow || false}
                    onChange={() => setSeoData({ ...seoData, nofollow: !seoData.nofollow })}
                    onLabel="Yes"
                    offLabel="No"
                  />
                </Box>
              </Box>
            </Flex>
          </Box>
        </Tabs.Content>
        <Tabs.Content value="og">
          {seoData.ogGroup && Array.isArray(seoData.ogGroup) &&
            seoData.ogGroup.map((og: any, index: number) => (
              <Box
                key={index}
                paddingBottom={3}
                style={{ borderBottom: '1px solid #eaeaea', marginBottom: '12px', paddingBottom: '12px' }}
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
            ))
          }
        </Tabs.Content>
        <Tabs.Content value="schema">
          {seoData.schema && Array.isArray(seoData.schema) &&
            seoData.schema.map((s: any, index: number) => (
              <Box
                key={index}
                paddingBottom={3}
                style={{ borderBottom: '1px solid #eaeaea', marginBottom: '12px', paddingBottom: '12px' }}
              >
                <Flex justifyContent="space-between" alignItems="center" paddingBottom={2}>
                  <Flex gap={2}>
                    <Badge>{s.title || `Schema ${index + 1}`}</Badge>
                    <Typography variant="pi" textColor="neutral600">{s.type}</Typography>
                  </Flex>
                  <CopyButton
                    value={typeof s.schema === 'string' ? s.schema : JSON.stringify(s.schema, null, 2)}
                    copyKey={`schema-${index}`}
                  />
                </Flex>
                <Textarea
                  value={typeof s.schema === 'string' ? s.schema : JSON.stringify(s.schema, null, 2)}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                    const newSchema = [...seoData.schema];
                    try {
                      newSchema[index] = { ...newSchema[index], schema: JSON.parse(e.target.value) };
                    } catch {
                      newSchema[index] = { ...newSchema[index], schema: e.target.value };
                    }
                    setSeoData({ ...seoData, schema: newSchema });
                  }}
                  style={{ fontFamily: 'monospace', fontSize: '12px', minHeight: '150px' }}
                />
              </Box>
            ))
          }
        </Tabs.Content>
        <Tabs.Content value="json">
          <Box paddingBottom={2}>
            <Flex justifyContent="flex-end" paddingBottom={2}>
              <CopyButton value={JSON.stringify(seoData, null, 2)} copyKey="full-json" />
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

  const allFieldsSelected = selectedFields.length === SEO_FIELDS.length;

  // ─── Step 1: Configuration ──────────────────────────────────────────────────

  const renderConfigStep = () => (
    <>
      <Modal.Body style={{ padding: '16px 24px' }}>
        {/* Page Instructions */}
        <Box paddingBottom={4}>
          <Textarea
            label="Page Instructions (Optional)"
            placeholder="Describe the page type and provide context for better SEO. E.g., 'This is a product page for a luxury watch targeting high-end customers in the US market.'"
            value={pageInstructions}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setPageInstructions(e.target.value)
            }
            hint="Give the AI context about the page type, audience, or any specific SEO requirements."
          />
        </Box>

        {/* Fields to Generate */}
        <Box
          padding={4}
          background="neutral100"
          hasRadius
          style={{ border: '1px solid #dcdce4', marginBottom: '16px' }}
        >
          <Flex justifyContent="space-between" alignItems="center" paddingBottom={3}>
            <Typography variant="delta" textColor="neutral800">
              Fields to Generate
            </Typography>
            <Button
              variant="ghost"
              size="S"
              onClick={() =>
                setSelectedFields(allFieldsSelected ? [] : SEO_FIELDS.map((f) => f.key))
              }
            >
              {allFieldsSelected ? 'Deselect All' : 'Select All'}
            </Button>
          </Flex>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {SEO_FIELDS.map((field) => (
              <Checkbox
                key={field.key}
                checked={selectedFields.includes(field.key)}
                onCheckedChange={(checked: boolean) =>
                  setSelectedFields((prev) =>
                    checked ? [...prev, field.key] : prev.filter((f) => f !== field.key)
                  )
                }
              >
                {field.label}
              </Checkbox>
            ))}
          </div>
        </Box>

        {/* Schema Types — only when Schema Markup is selected */}
        {selectedFields.includes('schema') && (
          <Box
            padding={4}
            background="neutral100"
            hasRadius
            style={{ border: '1px solid #dcdce4' }}
          >
            <Flex justifyContent="space-between" alignItems="center" paddingBottom={3}>
              <Typography variant="delta" textColor="neutral800">
                Schema Types
              </Typography>
              <Button
                variant="ghost"
                size="S"
                onClick={() =>
                  setSelectedSchemas(
                    selectedSchemas.length === TOP_12_SCHEMAS.length
                      ? []
                      : TOP_12_SCHEMAS.map((s) => s.value)
                  )
                }
              >
                {selectedSchemas.length === TOP_12_SCHEMAS.length ? 'Deselect All' : 'Select All'}
              </Button>
            </Flex>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {TOP_12_SCHEMAS.map((schema) => (
                <Checkbox
                  key={schema.value}
                  checked={selectedSchemas.includes(schema.value)}
                  onCheckedChange={(checked: boolean) =>
                    setSelectedSchemas((prev) =>
                      checked ? [...prev, schema.value] : prev.filter((s) => s !== schema.value)
                    )
                  }
                >
                  {schema.label}
                </Checkbox>
              ))}
            </div>
            <Box paddingTop={4}>
              <TextInput
                label="Additional Schema Types"
                placeholder="e.g. Recipe, VideoObject, Course (comma separated)"
                value={customSchemas}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCustomSchemas(e.target.value)
                }
                hint="AI will generate these additional schema types along with the selected ones above"
              />
            </Box>
          </Box>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Flex justifyContent="flex-end" width="100%">
          <Button
            onClick={handleGenerate}
            startIcon={<Sparkle />}
            size="M"
            disabled={selectedFields.length === 0}
          >
            Generate SEO Tags
          </Button>
        </Flex>
      </Modal.Footer>
    </>
  );

  // ─── Step 2: Results ─────────────────────────────────────────────────────────

  const renderResultStep = () => (
    <>
      <Modal.Body style={{ padding: '16px 24px' }}>
        {error && (
          <Box paddingBottom={4}>
            <Alert variant="danger" title="Error" onClose={() => setError(null)} closeLabel="Close">
              {error}
            </Alert>
          </Box>
        )}

        {success && (
          <Box paddingBottom={4}>
            <Alert variant="success" title="Success" onClose={() => setSuccess(null)} closeLabel="Close">
              {success}
            </Alert>
          </Box>
        )}

        {loading ? (
          <Flex direction="column" alignItems="center" justifyContent="center" padding={8} gap={4}>
            <Loader />
            <Typography variant="omega" textColor="neutral600">
              Analyzing content and generating SEO tags...
            </Typography>
          </Flex>
        ) : seoData ? (
          structureType === 'yoastHeadJson' ? renderYoastView() : renderSeoComponentView()
        ) : null}
      </Modal.Body>

      <Modal.Footer>
        <Flex justifyContent="space-between" width="100%">
          <Button variant="tertiary" startIcon={<ArrowLeft />} onClick={handleBack} disabled={loading}>
            Back
          </Button>
          <Flex gap={2}>
            {seoData && (
              <>
                <Button
                  onClick={handleRegenerate}
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
                  Apply to Draft
                </Button>
              </>
            )}
          </Flex>
        </Flex>
      </Modal.Footer>
    </>
  );

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
                <Badge>{step === 'config' ? 'Step 1 of 2 — Configure' : 'Step 2 of 2 — Results'}</Badge>
              </Flex>
            </Modal.Title>
            {step === 'result' && structureType !== 'none' && seoData && (
              <Badge>
                {structureType === 'yoastHeadJson' ? 'Yoast Head JSON' : 'SEO Component'}
              </Badge>
            )}
          </Flex>
        </Modal.Header>

        {step === 'config' ? renderConfigStep() : renderResultStep()}
      </Modal.Content>
    </Modal.Root>
  );
};

export { AiSeoModal };
export default AiSeoModal;
