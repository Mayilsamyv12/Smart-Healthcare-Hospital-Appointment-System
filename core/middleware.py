from django.http import HttpResponse

class SPAMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Check if this is an SPA request from our React frontend
        if request.headers.get('X-SPA-Request') == 'true' and hasattr(response, 'content'):
            try:
                content = response.content.decode('utf-8')
                
                # Extract only the content within #django-server-content
                start_marker = '<div id="django-server-content" style="display: none;">'
                end_marker = '</div>' # This is tricky if there are nested divs
                
                # A more robust way to extract just the middle part of the HTML
                # Since we know the structure of base.html, we can slice it
                if start_marker in content:
                    parts = content.split(start_marker)
                    after_start = parts[1]
                    
                    # Find the corresponding closing div (this assumes we don't have deep nesting issues 
                    # at the top level of django-server-content)
                    # Actually, we can just return the inner HTML and let the client handle it.
                    
                    # Let's use a simpler approach: return the whole content within the content block
                    # but skip the base.html layout overhead if we can.
                    # But the easiest way without modifying every view is to just slice the rendered HTML.
                    
                    # Finding the end of the django-server-content div accurately:
                    # We look for the next large block which is <div id="react-app-root">
                    end_boundary = '<div id="react-app-root">'
                    if end_boundary in after_start:
                        inner_content = after_start.split(end_boundary)[0]
                        # Remove the trailing </div> from django-server-content
                        inner_content = inner_content.rsplit('</div>', 1)[0]
                        
                        # Return the inner content
                        # We still wrap it in the same ID so the client parser finds it
                        new_content = f'<div id="django-server-content">{inner_content}</div>'
                        return HttpResponse(new_content)
            except Exception:
                pass
                
        return response
