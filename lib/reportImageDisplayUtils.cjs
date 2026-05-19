"use strict";

function shouldShowImageThumbnail(imageUrl, imageLoadFailed) {
  return Boolean(imageUrl) && !Boolean(imageLoadFailed);
}

module.exports = {
  shouldShowImageThumbnail,
};
