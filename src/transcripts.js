import ubeEp1 from '../content/the-ube-folk-of-amihan-hollow/episode-1/transcript-lines.json';
import zubieEp1 from '../content/the-adventures-of-zubie-and-robo-rex/episode-1/transcript-lines.json';
import noriEp1 from '../content/nori-and-the-pocket-meadow/episode-1/transcript-lines.json';
import juniperEp1 from '../content/juniper-and-the-lantern-library/episode-1/transcript-lines.json';
import pipEp1 from '../content/pip-and-the-moonlight-mailbox/episode-1/transcript-lines.json';
import pipEp2 from '../content/pip-and-the-moonlight-mailbox/episode-2/transcript-lines.json';
import blockyEp1 from '../content/blocky-explores-mine-world/episode-1/transcript-lines.json';
import keepersEp1 from '../content/keepers-of-turtleshell-city/episode-1/transcript-lines.json';

const transcriptMap = {
  'the-ube-folk-of-amihan-hollow:1': ubeEp1,
  'the-adventures-of-zubie-and-robo-rex:1': zubieEp1,
  'nori-and-the-pocket-meadow:1': noriEp1,
  'juniper-and-the-lantern-library:1': juniperEp1,
  'pip-and-the-moonlight-mailbox:1': pipEp1,
  'pip-and-the-moonlight-mailbox:2': pipEp2,
  'blocky-explores-mine-world:1': blockyEp1,
  'keepers-of-turtleshell-city:1': keepersEp1,
};

export function getTranscriptLines(slug, episodeId) {
  return transcriptMap[`${slug}:${episodeId}`] || [];
}
