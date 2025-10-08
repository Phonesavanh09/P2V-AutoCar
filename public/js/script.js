function openLightbox(src){
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  img.src = src;
  lb.style.display = 'flex';
}
function closeLightbox(){
  document.getElementById('lightbox').style.display='none';
}