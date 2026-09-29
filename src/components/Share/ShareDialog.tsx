import { Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { copyText } from '../../services/clipboardService';
import { buildShareUrl, SHARE_URL_WARN_LENGTH } from '../../services/shareService';
import type { Diagram } from '../../types/diagram';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  diagram: Diagram;
}

function currentBaseUrl(): string {
  const url = new URL(window.location.href);
  url.hash = '';
  return url.toString();
}

function ShareDialogContent({ onClose, diagram }: Omit<ShareDialogProps, 'open'>) {
  const toast = useToast();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const url = useMemo(() => buildShareUrl(diagram, currentBaseUrl()), [diagram]);
  const tooLong = url.length > SHARE_URL_WARN_LENGTH;

  const onCopy = async () => {
    const r = await copyText(url, 'Share link');
    if (r.ok) toast.success(r.message);
    else {
      inputRef.current?.select();
      toast.error(r.message + ' The link is selected; press Ctrl/Cmd+C to copy it.');
    }
  };

  return (
    <Modal
      open
      title="Share diagram"
      description="The link contains the whole diagram, compressed into the URL fragment (#…). Nothing is uploaded."
      onClose={onClose}
      initialFocus=".btn--copy-link"
      footer={
        <>
          <a className="btn" href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} aria-hidden /> Open in new tab
          </a>
          <button type="button" className="btn btn--primary btn--copy-link" onClick={onCopy}>
            <Copy size={14} aria-hidden /> Copy share link
          </button>
        </>
      }
    >
      <label className="field__label" htmlFor="share-url">
        Share link ({url.length.toLocaleString()} characters)
      </label>
      <textarea id="share-url" ref={inputRef} className="input share-url" readOnly value={url} rows={4} onFocus={(e) => e.currentTarget.select()} />
      {tooLong && (
        <p className="notice notice--warning">
          This link is very long. Most browsers open it fine, but some chat apps and email clients truncate long URLs. For large diagrams, share a .himatdiagram file instead.
        </p>
      )}
      <p className="notice">
        <ShieldCheck size={14} aria-hidden /> Browsers never send the fragment part of a URL to servers, so the diagram stays between you and the people you share the link with.
      </p>
    </Modal>
  );
}

export function ShareDialog({ open, ...rest }: ShareDialogProps) {
  if (!open) return null;
  return <ShareDialogContent {...rest} />;
}
