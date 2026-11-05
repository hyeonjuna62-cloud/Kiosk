let menu = [], cart = [], category = 'all', selectedProduct = null, temperature = 'ICE', orderType = '매장', paymentMethod = '카드', submitting = false;
const $ = (id) => document.getElementById(id);
const money = (value) => `${value.toLocaleString('ko-KR')}원`;
const modal = $('modal');
function renderMenu() {
  $('menu').innerHTML = menu.filter(p => category === 'all' || p.category === category).map(p => `<button class="product" data-id="${p.id}"><div class="product-art ${p.color}" aria-hidden="true">${p.icon}</div><div class="product-info"><div class="en">${p.english}</div><h3>${p.name}</h3><p>${p.description}</p><div class="price-row">${money(p.price)}<span class="add">+</span></div></div></button>`).join('');
}
function renderCart() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  $('count').textContent = count;
  $('total').textContent = money(cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0));
  $('checkout').disabled = !count;
  $('cart-items').innerHTML = count ? cart.map((item, i) => `<div class="cart-item"><div class="item-line"><span>${item.product.name}</span><span>${money(item.product.price * item.quantity)}</span></div><div class="item-sub">${item.temperature === 'NONE' ? '디저트' : item.temperature}</div><div class="item-controls"><div class="quantity"><button data-action="minus" data-index="${i}" aria-label="수량 줄이기">−</button><span>${item.quantity}</span><button data-action="plus" data-index="${i}" aria-label="수량 늘리기">+</button></div><button class="remove" data-action="remove" data-index="${i}">삭제</button></div></div>`).join('') : '<div class="empty"><div class="empty-icon">♧</div><strong>아직 담은 메뉴가 없어요</strong><div>마음에 드는 메뉴를 선택해 주세요.</div></div>';
}
function showModal(html) { $('modal-content').innerHTML = html; modal.classList.remove('hidden'); }
function hideModal() { if (!submitting) modal.classList.add('hidden'); }
function productModal(p) {
  selectedProduct = p; temperature = 'ICE';
  showModal(`<div class="eyebrow">SELECT YOUR MENU</div><h2 id="modal-title">${p.name}</h2><p>${p.description} · ${money(p.price)}</p>${p.category !== 'dessert' ? '<div class="option-label">온도를 선택해 주세요</div><div class="options"><button data-temp="HOT">HOT</button><button class="selected" data-temp="ICE">ICE</button></div>' : ''}<button class="primary" id="add-cart">담기 <span>→</span></button>`);
}
function checkoutModal() {
  orderType = '매장'; paymentMethod = '카드';
  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  showModal(`<div class="eyebrow">CHECKOUT</div><h2 id="modal-title">주문을 완료해 주세요</h2><p>아래 결제는 실제 청구되지 않는 모의 결제입니다.</p><div class="option-label">이용 방법</div><div class="options"><button class="selected" data-type="매장">매장</button><button data-type="포장">포장</button></div><div class="option-label">결제 방법</div><div class="options"><button class="selected" data-payment="카드">카드</button><button data-payment="간편결제">간편결제</button></div><div class="modal-total"><span>총 결제금액</span><span>${money(total)}</span></div><p id="error" class="error" aria-live="polite"></p><button class="primary" id="pay">모의 결제하기 <span>→</span></button>`);
}
document.querySelector('.tabs').addEventListener('click', e => { const button = e.target.closest('[data-category]'); if (!button) return; category = button.dataset.category; document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('active', b === button)); renderMenu(); });
$('menu').addEventListener('click', e => { const button = e.target.closest('[data-id]'); if (button) productModal(menu.find(p => p.id === button.dataset.id)); });
$('cart-items').addEventListener('click', e => { const button = e.target.closest('[data-action]'); if (!button) return; const i = Number(button.dataset.index); if (button.dataset.action === 'remove') cart.splice(i, 1); else if (button.dataset.action === 'minus') { if (--cart[i].quantity === 0) cart.splice(i, 1); } else if (cart[i].quantity < 99) cart[i].quantity++; renderCart(); });
$('checkout').addEventListener('click', checkoutModal);
$('close').addEventListener('click', hideModal);
modal.addEventListener('click', async e => {
  if (e.target === modal) return hideModal();
  const button = e.target.closest('button'); if (!button || submitting) return;
  for (const [attribute, setter] of [['temp', v => temperature = v], ['type', v => orderType = v], ['payment', v => paymentMethod = v]]) {
    if (button.dataset[attribute]) { setter(button.dataset[attribute]); button.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('selected', b === button)); return; }
  }
  if (button.id === 'add-cart') { const temp = selectedProduct.category === 'dessert' ? 'NONE' : temperature; const existing = cart.find(i => i.product.id === selectedProduct.id && i.temperature === temp); if (existing) existing.quantity = Math.min(99, existing.quantity + 1); else cart.push({product: selectedProduct, temperature: temp, quantity: 1}); renderCart(); hideModal(); }
  if (button.id === 'done') hideModal();
  if (button.id === 'pay') {
    submitting = true; button.disabled = true; button.textContent = '주문을 처리하고 있어요...';
    try { const response = await fetch('/api/orders', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({items:cart.map(i => ({product_id:i.product.id, quantity:i.quantity, temperature:i.temperature})), order_type:orderType, payment_method:paymentMethod})}); const data = await response.json(); if (!response.ok) throw new Error(data.detail || '주문에 실패했습니다.'); cart = []; renderCart(); showModal(`<div class="success"><div class="success-icon">✓</div><h2 id="modal-title">주문이 완료되었어요!</h2><p>주문해 주셔서 감사합니다.<br>맛있는 메뉴를 준비할게요.</p><div class="order-number">주문 번호 &nbsp; ${data.order_number}</div><p>모의 결제가 완료되었습니다. 실제 청구는 없습니다.</p><button class="primary" id="done">확인</button></div>`); } catch (error) { $('error').textContent = error.message || '서버에 연결할 수 없습니다.'; button.disabled = false; button.textContent = '모의 결제하기'; } finally { submitting = false; }
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') hideModal(); });
fetch('/api/menu').then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(data => { menu = data; renderMenu(); }).catch(() => { $('menu').textContent = '메뉴를 불러오지 못했습니다. 페이지를 새로고침해 주세요.'; });
renderCart();
