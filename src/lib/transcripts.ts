import ubeEp1 from '../../content/the-ube-folk-of-amihan-hollow/episode-1/transcript-lines.json';
import zubieEp1 from '../../content/the-adventures-of-zubie-and-robo-rex/episode-1/transcript-lines.json';
import noriEp1 from '../../content/nori-and-the-pocket-meadow/episode-1/transcript-lines.json';
import juniperEp1 from '../../content/juniper-and-the-lantern-library/episode-1/transcript-lines.json';
import pipEp1 from '../../content/pip-and-the-moonlight-mailbox/episode-1/transcript-lines.json';
import pipEp2 from '../../content/pip-and-the-moonlight-mailbox/episode-2/transcript-lines.json';
import blockyEp1 from '../../content/blocky-explores-mine-world/episode-1/transcript-lines.json';
import keepersEp1 from '../../content/keepers-of-turtleshell-city/episode-1/transcript-lines.json';

type TranscriptLine = { id: string | number; text: string };

const transcriptMap: Record<string, TranscriptLine[]> = {
  'the-ube-folk-of-amihan-hollow:1': ubeEp1 as unknown as TranscriptLine[],
  'the-adventures-of-zubie-and-robo-rex:1': zubieEp1 as unknown as TranscriptLine[],
  'nori-and-the-pocket-meadow:1': noriEp1 as unknown as TranscriptLine[],
  'juniper-and-the-lantern-library:1': juniperEp1 as unknown as TranscriptLine[],
  'pip-and-the-moonlight-mailbox:1': pipEp1 as unknown as TranscriptLine[],
  'pip-and-the-moonlight-mailbox:2': pipEp2 as unknown as TranscriptLine[],
  'blocky-explores-mine-world:1': blockyEp1 as unknown as TranscriptLine[],
  'keepers-of-turtleshell-city:1': keepersEp1 as unknown as TranscriptLine[],
};

export function getTranscriptLines(
  slug: string,
  episodeId: string | number
): TranscriptLine[] {
  return transcriptMap[`${slug}:${episodeId}`] || [];
}
