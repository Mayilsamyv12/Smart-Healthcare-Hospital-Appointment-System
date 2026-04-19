import json
import razorpay
from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.csrf import csrf_exempt

from .models import CartItem, LabAppointment, LabReview, LabTest, Medicine, Order

# Razorpay Client Initialization
razorpay_client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

from django.db import models

def medicine_list(request):
    """View to list all medicines in the pharmacy."""
    medicines = Medicine.objects.all()
    
    query = request.GET.get("q")
    if query:
        medicines = medicines.filter(
            models.Q(name__icontains=query) |
            models.Q(description__icontains=query)
        ).distinct()
        
    return render(request, "commerce/medicine_list.html", {"medicines": medicines})

def lab_test_list(request):
    tests = LabTest.objects.all()
    
    query = request.GET.get("q")
    if query:
        tests = tests.filter(
            models.Q(name__icontains=query) |
            models.Q(about__icontains=query) |
            models.Q(location__icontains=query)
        ).distinct()

    user_location = request.session.get("user_location")
    if user_location:
        tests = tests.filter(location__icontains=user_location)

    return render(
        request,
        "commerce/lab_test_list.html",
        {"tests": tests, "current_location": user_location},
    )

@login_required
def add_to_cart(request, type, id):
    try:
        if type == "medicine":
            item = get_object_or_404(Medicine, id=id)
            CartItem.objects.get_or_create(user=request.user, medicine=item)
            messages.success(request, f"{item.name} added to cart!")
                
        elif type == "lab_test":
            item = get_object_or_404(LabTest, id=id)
            CartItem.objects.get_or_create(user=request.user, lab_test=item)
            messages.success(request, f"{item.name} added to cart!")

    except Exception as e:
        messages.error(request, "An error occurred while adding to cart.")
    return redirect("commerce:cart_view")

@login_required
def remove_from_cart(request, item_id):
    item = CartItem.objects.filter(id=item_id, user=request.user).first()
    if item:
        name = item.medicine.name if item.medicine else item.lab_test.name
        item.delete()
        messages.success(request, f"Removed {name} from cart.")
    return redirect("commerce:cart_view")

@login_required
def cart_update_quantity(request, item_id, action):
    item = CartItem.objects.filter(id=item_id, user=request.user).first()
    if not item:
        return redirect("commerce:cart_view")
    
    name = item.medicine.name if item.medicine else item.lab_test.name
    
    if action == "increase":
        item.quantity += 1
        item.save()
        messages.success(request, f"Increased quantity for {name}.")
    elif action == "decrease":
        if item.quantity > 1:
            item.quantity -= 1
            item.save()
            messages.success(request, f"Decreased quantity for {name}.")
        else:
            messages.info(request, f"Minimum quantity reached for {name}. Use the × button to remove.")
    return redirect("commerce:cart_view")

@login_required
def cart_update_manual(request, item_id):
    if request.method == "POST":
        item = CartItem.objects.filter(id=item_id, user=request.user).first()
        if item:
            try:
                new_qty = int(request.POST.get("quantity", 1))
                if new_qty > 0:
                    item.quantity = new_qty
                    item.save()
                    messages.success(request, "Quantity updated.")
                else:
                    item.delete()
                    messages.success(request, "Item removed.")
            except ValueError:
                messages.error(request, "Invalid quantity.")
    return redirect("commerce:cart_view")

@login_required
def cart_view(request):
    items = CartItem.objects.filter(user=request.user)
    total = sum(item.get_total_price() for item in items)
    return render(request, "commerce/cart.html", {"items": items, "total": total})

@login_required
def checkout_address(request):
    items = CartItem.objects.filter(user=request.user)
    total = sum(item.get_total_price() for item in items)
    
    if request.method == "POST":
        request.session["checkout_address"] = {
            "house_no": request.POST.get("house_no"),
            "street": request.POST.get("street"),
            "landmark": request.POST.get("landmark"),
            "pincode": request.POST.get("pincode"),
            "city": request.POST.get("city"),
        }
        return redirect("commerce:checkout_payment")
    return render(request, "commerce/checkout_address.html", {"items": items, "total": total})

# ── Razorpay API Endpoints ─────────────────────────────────────

@login_required
def create_razorpay_order(request):
    if request.method == "POST":
        cart_items = CartItem.objects.filter(user=request.user)
        total = sum(item.get_total_price() for item in cart_items)
        # Razorpay expects amount in paise (e.g. 100 Rs = 10000 paise)
        amount = int(total * 100)
        
        razorpay_order = razorpay_client.order.create({
            "amount": amount,
            "currency": "INR",
            "payment_capture": "1"
        })
        return JsonResponse({
            "order_id": razorpay_order['id'],
            "amount": amount,
            "key": settings.RAZORPAY_KEY_ID
        })
    return JsonResponse({"error": "Invalid request"}, status=400)

@csrf_exempt
@login_required
def verify_payment(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            # Signature Verification
            razorpay_client.utility.verify_payment_signature({
                'razorpay_order_id': data['razorpay_order_id'],
                'razorpay_payment_id': data['razorpay_payment_id'],
                'razorpay_signature': data['razorpay_signature']
            })
            
            # Create finalized order
            addr = request.session.get("checkout_address")
            cart_items = CartItem.objects.filter(user=request.user)
            total = sum(item.get_total_price() for item in cart_items)
            items_json = json.dumps([{
                "name": i.medicine.name if i.medicine else i.lab_test.name,
                "price": float(i.medicine.price if i.medicine else 0.0),
                "quantity": i.quantity
            } for i in cart_items])

            Order.objects.create(
                user=request.user,
                house_no=addr["house_no"],
                street=addr["street"],
                landmark=addr["landmark"],
                pincode=addr["pincode"],
                city=addr["city"],
                items=items_json,
                total_amount=total,
                payment_method="Online",
                is_paid=True,
                razorpay_order_id=data['razorpay_order_id'],
                razorpay_payment_id=data['razorpay_payment_id'],
                razorpay_signature=data['razorpay_signature']
            )
            cart_items.delete()
            return JsonResponse({"status": "Success"})
        except Exception as e:
            return JsonResponse({"status": "Failure", "error": str(e)}, status=400)
    return JsonResponse({"status": "Failure"}, status=400)

@login_required
def checkout_payment(request):
    items = CartItem.objects.filter(user=request.user)
    total = sum(item.get_total_price() for item in items)

    if request.method == "POST":
        # Handle Cash on Delivery (COD)
        addr = request.session.get("checkout_address")
        if not addr: return redirect("commerce:checkout_address")
        
        payment_method = request.POST.get("payment_method")
        if payment_method == "COD":
            items_json = json.dumps([{
                "name": i.medicine.name if i.medicine else i.lab_test.name,
                "price": float(i.medicine.price if i.medicine else 0.0),
                "quantity": i.quantity
            } for i in items])

            Order.objects.create(
                user=request.user,
                house_no=addr["house_no"],
                street=addr["street"],
                landmark=addr["landmark"],
                pincode=addr["pincode"],
                city=addr["city"],
                items=items_json,
                total_amount=total,
                payment_method="COD",
            )
            items.delete()
            messages.success(request, "Order placed successfully (COD)!")
            return redirect("/patient/profile/")

    return render(request, "commerce/checkout_payment.html", {
        "items": items,
        "total": total,
        "razorpay_key": settings.RAZORPAY_KEY_ID
    })

@login_required
def order_medicine(request):
    return render(request, "commerce/order_medicine.html")

@login_required
def book_lab_test(request, lab_id):
    lab_test = get_object_or_404(LabTest, id=lab_id)
    reviews = lab_test.reviews.all().order_by("-created_at")
    
    # Date Handling
    selected_date_str = request.GET.get("date")
    from datetime import datetime
    if selected_date_str:
        try:
            selected_date = datetime.strptime(selected_date_str, "%Y-%m-%d").date()
        except ValueError:
            from datetime import date
            selected_date = date.today()
    else:
        from datetime import date
        selected_date = date.today()

    if request.method == "POST":
        if "rating" in request.POST and "comment" in request.POST:
            # Handle review submission
            rating = request.POST.get("rating")
            comment = request.POST.get("comment")
            LabReview.objects.create(
                lab=lab_test,
                user=request.user,
                rating=rating,
                comment=comment
            )
            messages.success(request, "Review added successfully!")
            return redirect("commerce:book_lab_test", lab_id=lab_id)

        elif "date" in request.POST and "time" in request.POST:
            # Handle lab booking
            date_str = request.POST.get("date")
            time_str = request.POST.get("time")
            
            # Validation
            max_patients = lab_test.patients_per_slot or 5
            booked_count = LabAppointment.objects.filter(
                lab_test=lab_test, date=date_str, time=time_str
            ).exclude(status="Cancelled").count()

            if booked_count >= max_patients:
                messages.error(request, "This time slot is fully booked.")
                return redirect("commerce:book_lab_test", lab_id=lab_id)

            LabAppointment.objects.create(
                user=request.user, 
                lab_test=lab_test, 
                date=date_str, 
                time=time_str
            )
            messages.success(request, "Lab Test booked successfully!")
            return redirect("reminder_list")
        
    # Generate Slots
    from datetime import time, timedelta
    
    # Date Exception Check
    unavailable = [d.strip() for d in (lab_test.unavailable_dates or '').split(',') if d.strip()]
    if selected_date.strftime('%Y-%m-%d') in unavailable:
        return render(request, "commerce/book_lab_test.html", {
            "lab_test": lab_test, 
            "reviews": reviews,
            "selected_date": selected_date.strftime("%Y-%m-%d"), 
            "slots": [],
            "leave_day": True
        })

    day_abbr = selected_date.strftime("%a")
    schedule = (lab_test.weekly_schedule or {}).get(day_abbr)

    if schedule:
        if not schedule.get('active'):
            return render(request, "commerce/book_lab_test.html", { "lab_test": lab_test, "reviews": reviews, "selected_date": selected_date_str, "slots": [] })
        try:
            shift_start = datetime.strptime(schedule.get('start', '09:00'), "%H:%M").time()
            shift_end = datetime.strptime(schedule.get('end', '18:00'), "%H:%M").time()
        except:
            shift_start = lab_test.shift_start_time or time(9, 0)
            shift_end = lab_test.shift_end_time or time(18, 0)
    else:
        if day_abbr not in (lab_test.available_days or ''):
             return render(request, "commerce/book_lab_test.html", { "lab_test": lab_test, "reviews": reviews, "selected_date": selected_date_str, "slots": [] })
        shift_start = lab_test.shift_start_time or time(9, 0)
        shift_end = lab_test.shift_end_time or time(18, 0)
    
    current_dt = datetime.combine(selected_date, shift_start)
    end_dt = datetime.combine(selected_date, shift_end)
    if end_dt <= current_dt: end_dt += timedelta(days=1)

    duration_mins = lab_test.slot_duration_minutes or 30
    max_patients = lab_test.patients_per_slot or 5

    slots = []
    while current_dt < end_dt:
        slot_time = current_dt.time()
        booked_count = LabAppointment.objects.filter(lab_test=lab_test, date=selected_date, time=slot_time).exclude(status="Cancelled").count()
        slots.append({
            "time": slot_time.strftime("%H:%M:%S"),
            "label": current_dt.strftime("%I:%M %p"),
            "is_booked": booked_count >= max_patients,
            "booked_count": booked_count,
            "max_patients": max_patients
        })
        current_dt += timedelta(minutes=duration_mins)

    return render(request, "commerce/book_lab_test.html", {
        "lab_test": lab_test,
        "reviews": reviews,
        "slots": slots,
        "selected_date": selected_date.strftime("%Y-%m-%d"),
    })

@login_required
def edit_lab_review(request, review_id):
    review = get_object_or_404(LabReview, id=review_id, user=request.user)
    if request.method == "POST":
        rating = request.POST.get("rating")
        comment = request.POST.get("comment")
        review.rating = rating
        review.comment = comment
        review.save()
        messages.success(request, "Review updated successfully!")
    return redirect("commerce:book_lab_test", lab_id=review.lab.id)

@login_required
def delete_lab_review(request, review_id):
    review = get_object_or_404(LabReview, id=review_id, user=request.user)
    lab_id = review.lab.id
    if request.method == "POST":
        review.delete()
        messages.success(request, "Review deleted successfully!")
    return redirect("commerce:book_lab_test", lab_id=lab_id)
