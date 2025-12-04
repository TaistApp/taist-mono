@extends('layouts.admin')
@section('content')
   <link rel="stylesheet" href="/assets/admin/index.css?r={{ time() }}">
	<div class="admin_wrapper">
      <div class="flex flex_between mb24">
         <div class="fsize24 font_bold">Discount Codes</div>
         <button class="btn btn_primary" onclick="showCreateModal()">+ Create New Code</button>
      </div>
      
      <div class="div_table">
         <table class="table" id="table">
            <thead>
               <tr>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Value</th>
                  <th>Uses</th>
                  <th>Valid Until</th>
                  <th>Status</th>
                  <th>Actions</th>
               </tr>
            </thead>
            <tbody>
               <?php foreach ($codes as $code) { ?>
                  <tr id="code-<?php echo $code->id; ?>">
                     <td>
                        <strong><?php echo $code->code; ?></strong>
                        <?php if($code->description) { ?>
                           <br><small style="color: #666;"><?php echo $code->description; ?></small>
                        <?php } ?>
                     </td>
                     <td>
                        <?php if($code->discount_type == 'fixed') { ?>
                           <span class="badge" style="background: #3B82F6; color: white; padding: 4px 8px; border-radius: 4px;">Fixed Amount</span>
                        <?php } else { ?>
                           <span class="badge" style="background: #8B5CF6; color: white; padding: 4px 8px; border-radius: 4px;">Percentage</span>
                        <?php } ?>
                     </td>
                     <td>
                        <?php if($code->discount_type == 'fixed') { ?>
                           $<?php echo number_format($code->discount_value, 2); ?>
                        <?php } else { ?>
                           <?php echo $code->discount_value; ?>%
                        <?php } ?>
                     </td>
                     <td>
                        <?php echo $code->current_uses; ?>
                        <?php if($code->max_uses) { ?>
                           / <?php echo $code->max_uses; ?>
                        <?php } else { ?>
                           / ∞
                        <?php } ?>
                     </td>
                     <td>
                        <?php if($code->valid_until) { ?>
                           <?php echo date('M d, Y', strtotime($code->valid_until)); ?>
                        <?php } else { ?>
                           <span style="color: #999;">Never</span>
                        <?php } ?>
                     </td>
                     <td>
                        <?php if($code->is_active) { ?>
                           <span class="badge" style="background: #10B981; color: white; padding: 4px 8px; border-radius: 4px;">Active</span>
                        <?php } else { ?>
                           <span class="badge" style="background: #EF4444; color: white; padding: 4px 8px; border-radius: 4px;">Inactive</span>
                        <?php } ?>
                     </td>
                     <td>
                        <button class="btn btn_sm" style="padding: 4px 8px; margin: 2px;" onclick="viewUsage(<?php echo $code->id; ?>)">
                           View Usage
                        </button>
                        <button class="btn btn_sm" style="padding: 4px 8px; margin: 2px;" onclick="editCode(<?php echo $code->id; ?>)">
                           Edit
                        </button>
                        <?php if($code->is_active) { ?>
                           <button class="btn btn_sm" style="padding: 4px 8px; margin: 2px; background: #EF4444; color: white;" onclick="deactivateCode(<?php echo $code->id; ?>)">
                              Deactivate
                           </button>
                        <?php } else { ?>
                           <button class="btn btn_sm" style="padding: 4px 8px; margin: 2px; background: #10B981; color: white;" onclick="activateCode(<?php echo $code->id; ?>)">
                              Activate
                           </button>
                        <?php } ?>
                     </td>
                  </tr>
               <?php } ?>
            </tbody>
         </table>
      </div>
   </div>

   <!-- Create/Edit Modal -->
   <div id="codeModal" class="modal" style="display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.4);">
      <div class="modal-content" style="background-color: #fefefe; margin: 5% auto; padding: 20px; border: 1px solid #888; width: 600px; border-radius: 8px;">
         <span class="close" onclick="closeModal()" style="color: #aaa; float: right; font-size: 28px; font-weight: bold; cursor: pointer;">&times;</span>
         <h2 id="modalTitle">Create Discount Code</h2>
         <form id="codeForm" style="margin-top: 20px;">
            <input type="hidden" id="codeId" value="">
            
            <div style="margin-bottom: 15px;">
               <label style="display: block; margin-bottom: 5px; font-weight: bold;">Code *</label>
               <input type="text" id="code" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="e.g., SAVE5, WELCOME10">
            </div>
            
            <div style="margin-bottom: 15px;">
               <label style="display: block; margin-bottom: 5px; font-weight: bold;">Description</label>
               <input type="text" id="description" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="Internal note about this code">
            </div>
            
            <div style="margin-bottom: 15px;">
               <label style="display: block; margin-bottom: 5px; font-weight: bold;">Discount Type *</label>
               <select id="discount_type" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                  <option value="fixed">Fixed Amount ($)</option>
                  <option value="percentage">Percentage (%)</option>
               </select>
            </div>
            
            <div style="margin-bottom: 15px;">
               <label style="display: block; margin-bottom: 5px; font-weight: bold;">Discount Value *</label>
               <input type="number" id="discount_value" required step="0.01" min="0" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="e.g., 5.00 or 10">
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
               <div>
                  <label style="display: block; margin-bottom: 5px; font-weight: bold;">Max Total Uses</label>
                  <input type="number" id="max_uses" min="1" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="Leave empty for unlimited">
               </div>
               <div>
                  <label style="display: block; margin-bottom: 5px; font-weight: bold;">Max Uses Per Customer</label>
                  <input type="number" id="max_uses_per_customer" min="1" value="1" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
               </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
               <div>
                  <label style="display: block; margin-bottom: 5px; font-weight: bold;">Valid From</label>
                  <input type="datetime-local" id="valid_from" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
               </div>
               <div>
                  <label style="display: block; margin-bottom: 5px; font-weight: bold;">Valid Until</label>
                  <input type="datetime-local" id="valid_until" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
               </div>
            </div>
            
            <div style="margin-bottom: 15px;">
               <label style="display: block; margin-bottom: 5px; font-weight: bold;">Minimum Order Amount</label>
               <input type="number" id="minimum_order_amount" step="0.01" min="0" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="e.g., 20.00">
            </div>
            
            <div style="margin-bottom: 15px;">
               <label style="display: block; margin-bottom: 5px; font-weight: bold;">Maximum Discount Amount (for percentage)</label>
               <input type="number" id="maximum_discount_amount" step="0.01" min="0" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="e.g., 50.00">
            </div>
            
            <div style="margin-top: 20px; text-align: right;">
               <button type="button" onclick="closeModal()" style="padding: 10px 20px; margin-right: 10px; background: #ccc; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
               <button type="submit" style="padding: 10px 20px; background: #3B82F6; color: white; border: none; border-radius: 4px; cursor: pointer;">Save Code</button>
            </div>
         </form>
      </div>
   </div>

   <!-- Usage Modal -->
   <div id="usageModal" class="modal" style="display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.4);">
      <div class="modal-content" style="background-color: #fefefe; margin: 5% auto; padding: 20px; border: 1px solid #888; width: 800px; border-radius: 8px; max-height: 80%; overflow-y: auto;">
         <span class="close" onclick="closeUsageModal()" style="color: #aaa; float: right; font-size: 28px; font-weight: bold; cursor: pointer;">&times;</span>
         <h2>Code Usage History</h2>
         <div id="usageContent" style="margin-top: 20px;"></div>
      </div>
   </div>

@endsection
@section('page-scripts')
   <script src="/assets/admin/index.js?r={{ time() }}"></script>
   <script>
      function showCreateModal() {
         document.getElementById('modalTitle').textContent = 'Create Discount Code';
         document.getElementById('codeForm').reset();
         document.getElementById('codeId').value = '';
         document.getElementById('code').disabled = false;
         document.getElementById('codeModal').style.display = 'block';
      }

      function editCode(id) {
         // For now, just show message - full edit can be implemented later
         alert('Edit functionality: You can modify max_uses, dates, and minimum_order_amount for code ID: ' + id);
      }

      function closeModal() {
         document.getElementById('codeModal').style.display = 'none';
      }

      function closeUsageModal() {
         document.getElementById('usageModal').style.display = 'none';
      }

      document.getElementById('codeForm').addEventListener('submit', function(e) {
         e.preventDefault();
         
         const formData = {
            code: document.getElementById('code').value.toUpperCase(),
            description: document.getElementById('description').value,
            discount_type: document.getElementById('discount_type').value,
            discount_value: document.getElementById('discount_value').value,
            max_uses: document.getElementById('max_uses').value || null,
            max_uses_per_customer: document.getElementById('max_uses_per_customer').value || 1,
            valid_from: document.getElementById('valid_from').value || null,
            valid_until: document.getElementById('valid_until').value || null,
            minimum_order_amount: document.getElementById('minimum_order_amount').value || null,
            maximum_discount_amount: document.getElementById('maximum_discount_amount').value || null,
         };

         fetch('/admin/discount-codes', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
               'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
            },
            body: JSON.stringify(formData)
         })
         .then(response => response.json())
         .then(data => {
            if (data.success) {
               alert('Discount code created successfully!');
               location.reload();
            } else {
               alert('Error: ' + (data.error || 'Failed to create code'));
            }
         })
         .catch(error => {
            alert('Error: ' + error.message);
         });
      });

      function deactivateCode(id) {
         if (!confirm('Are you sure you want to deactivate this code?')) return;
         
         fetch('/admin/discount-codes/' + id + '/deactivate', {
            method: 'POST',
            headers: {
               'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
            }
         })
         .then(response => response.json())
         .then(data => {
            if (data.success) {
               alert('Code deactivated successfully!');
               location.reload();
            } else {
               alert('Error: ' + (data.error || 'Failed to deactivate code'));
            }
         });
      }

      function activateCode(id) {
         fetch('/admin/discount-codes/' + id + '/activate', {
            method: 'POST',
            headers: {
               'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
            }
         })
         .then(response => response.json())
         .then(data => {
            if (data.success) {
               alert('Code activated successfully!');
               location.reload();
            } else {
               alert('Error: ' + (data.error || 'Failed to activate code'));
            }
         });
      }

      function viewUsage(id) {
         fetch('/admin/discount-codes/' + id + '/usage')
         .then(response => response.json())
         .then(data => {
            if (data.success) {
               const code = data.data.code;
               const usages = data.data.usages;
               
               let html = '<h3>Code: ' + code.code + '</h3>';
               html += '<p>Total Uses: ' + code.current_uses + '</p>';
               
               if (usages.length > 0) {
                  html += '<table style="width: 100%; border-collapse: collapse; margin-top: 20px;">';
                  html += '<thead><tr style="background: #f3f4f6;"><th style="padding: 10px; border: 1px solid #ddd;">Customer</th><th style="padding: 10px; border: 1px solid #ddd;">Order ID</th><th style="padding: 10px; border: 1px solid #ddd;">Discount</th><th style="padding: 10px; border: 1px solid #ddd;">Used At</th></tr></thead>';
                  html += '<tbody>';
                  usages.forEach(usage => {
                     html += '<tr>';
                     html += '<td style="padding: 10px; border: 1px solid #ddd;">' + usage.customer_first_name + ' ' + usage.customer_last_name + '<br><small>' + usage.customer_email + '</small></td>';
                     html += '<td style="padding: 10px; border: 1px solid #ddd;">#' + usage.order_id + '</td>';
                     html += '<td style="padding: 10px; border: 1px solid #ddd;">$' + parseFloat(usage.discount_amount).toFixed(2) + '</td>';
                     html += '<td style="padding: 10px; border: 1px solid #ddd;">' + new Date(usage.used_at).toLocaleString() + '</td>';
                     html += '</tr>';
                  });
                  html += '</tbody></table>';
               } else {
                  html += '<p style="color: #666; margin-top: 20px;">No usage history yet.</p>';
               }
               
               document.getElementById('usageContent').innerHTML = html;
               document.getElementById('usageModal').style.display = 'block';
            } else {
               alert('Error loading usage data');
            }
         });
      }

      // Close modals when clicking outside
      window.onclick = function(event) {
         if (event.target.className === 'modal') {
            event.target.style.display = 'none';
         }
      }
   </script>
@endsection





