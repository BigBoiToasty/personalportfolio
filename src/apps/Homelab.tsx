import Tags, { LINK } from "./Tags";

const POINTS = [
  ["GPU sharing", "one RTX 2060 Super is shared between Jellyfin transcoding, Immich photo recognition and local LLMs (Ollama)"],
  ["Automation", "an n8n + local LLM pipeline reads my job-alert emails and sends push notifications"],
  ["Monitoring", "Prometheus and Grafana dashboards for thermals, VRAM and storage health"],
  ["Networking", "remote access over Tailscale, VPN-isolated services, and Wake-on-LAN scripts that start machines on demand"],
  ["Hardware", "custom 3D-printed cooling mounts for the GPU and storage controllers"],
];

export default function Homelab() {
  return (
    <article className="mx-auto max-w-2xl px-8 py-8 text-[15px] leading-relaxed text-mizu-foam/90">
      <h1 className="font-display text-xl font-semibold text-mizu-foam">Homelab</h1>
      <p className="mt-1 text-mizu-deep">Self-Hosted Infrastructure</p>

      <p className="mt-6 text-mizu-foam/85">
        A Proxmox server running 10+ containerized services on 13TB of redundant ZFS storage.
      </p>

      <ul className="mt-4 list-disc space-y-1.5 pl-5 text-mizu-foam/85">
        {POINTS.map(([lead, text]) => (
          <li key={lead}>
            <span className="font-medium text-mizu-foam">{lead}:</span> {text}
          </li>
        ))}
      </ul>

      <p className="mt-5 text-sm">
        <a href="https://github.com/BigBoiToasty/homelab-docs" target="_blank" rel="noreferrer" className={LINK}>
          Docs on GitHub ↗
        </a>
      </p>

      <Tags items={["Proxmox", "Docker", "ZFS", "CUDA", "Tailscale", "Grafana"]} />
    </article>
  );
}
